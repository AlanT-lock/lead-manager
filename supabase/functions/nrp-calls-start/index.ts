// Edge Function : lancer 2 appels NRP pour le télépro connecté (remplace la route Next.js pour éviter VAPI_API_KEY sur Vercel)

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const VAPI_API_URL = "https://api.vapi.ai";

/** Normalise le numéro lead : p:+336..., 0636..., +336... → +336... */
function normalizeLeadPhone(phone: string): string {
  let s = (phone || "").trim();
  if (s.toLowerCase().startsWith("p:")) s = s.slice(2).trim();
  const digits = s.replace(/\D/g, "");
  if (digits.length === 0) return s;
  if (digits.startsWith("33") && digits.length === 11) return `+${digits}`;
  if (digits.length === 10 && digits[0] === "0") return `+33${digits.slice(1)}`;
  if (digits.length === 9) return `+33${digits}`;
  if (s.startsWith("+")) return s;
  return `+33${digits.slice(-9)}`;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  const authHeader = req.headers.get("Authorization");
  const token = authHeader?.replace("Bearer ", "");
  if (!token) {
    return new Response(JSON.stringify({ error: "Non authentifié" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const authClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const {
    data: { user },
    error: userError,
  } = await authClient.auth.getUser(token);
  if (userError || !user) {
    return new Response(JSON.stringify({ error: "Token invalide" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const admin = createClient(supabaseUrl, supabaseServiceKey);
  const { data: profile } = await admin
    .from("profiles")
    .select("role, phone, vapi_assistant_id, vapi_phone_number_id, vapi_hold_message")
    .eq("id", user.id)
    .single();

  const role = profile?.role?.toString().trim().toLowerCase();
  if (role !== "telepro") {
    return new Response(
      JSON.stringify({ error: "Réservé aux télépros" }),
      { status: 403, headers: { "Content-Type": "application/json" } }
    );
  }

  const apiKey = Deno.env.get("VAPI_API_KEY");
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "Configuration Vapi manquante côté serveur" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  if (
    !profile!.vapi_assistant_id ||
    !profile!.vapi_phone_number_id ||
    !profile!.phone
  ) {
    return new Response(
      JSON.stringify({
        error:
          "Votre agent IA et/ou numéro ne sont pas configurés. Demandez à l'admin de les renseigner dans Utilisateurs.",
      }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const { data: nrpLeads } = await admin
    .from("leads")
    .select("id, phone")
    .eq("assigned_to", user.id)
    .eq("status", "nrp")
    .order("nrp_count", { ascending: true })
    .order("created_at", { ascending: true })
    .limit(2);

  if (!nrpLeads?.length) {
    return new Response(
      JSON.stringify({ error: "Aucun lead NRP à appeler pour le moment." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const holdMessage =
    profile!.vapi_hold_message ||
    "Un instant, nous vous mettons en relation avec un conseiller.";
  const createBody = (lead: { id: string; phone: string }) => ({
    assistantId: profile!.vapi_assistant_id,
    phoneNumberId: profile!.vapi_phone_number_id,
    customer: { number: normalizeLeadPhone(lead.phone) },
    metadata: {
      lead_id: lead.id,
      telepro_id: user.id,
      telepro_phone: profile!.phone,
      hold_message: holdMessage,
    },
  });

  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };

  const results = await Promise.allSettled(
    nrpLeads.map((lead: { id: string; phone: string }) =>
      fetch(`${VAPI_API_URL}/call`, {
        method: "POST",
        headers,
        body: JSON.stringify(createBody(lead)),
      })
    )
  );

  const batchId = crypto.randomUUID();
  const inserted: { call_id: string; lead_id: string; control_url: string | null }[] = [];

  for (let i = 0; i < results.length; i++) {
    const lead = nrpLeads[i];
    const result = results[i];
    if (result.status === "rejected" || !lead) continue;
    const res = result.value;
    if (!res.ok) continue;
    let data: {
      id?: string;
      monitor?: { controlUrl?: string };
      call?: { id?: string; monitor?: { controlUrl?: string } };
    };
    try {
      data = await res.json();
    } catch {
      continue;
    }
    const callId = data.id ?? data.call?.id;
    const controlUrl =
      data.monitor?.controlUrl ?? data.call?.monitor?.controlUrl ?? null;
    if (!callId) continue;
    await admin.from("nrp_call_batches").insert({
      batch_id: batchId,
      telepro_id: user.id,
      call_id: callId,
      lead_id: lead.id,
      control_url: controlUrl,
    });
    inserted.push({
      call_id: callId,
      lead_id: lead.id,
      control_url: controlUrl,
    });
  }

  if (inserted.length === 0) {
    const firstError = results.find(
      (r) =>
        r.status === "rejected" ||
        (r.status === "fulfilled" && !r.value.ok)
    );
    let errMsg = "Impossible de lancer les appels (Vapi ou réseau).";
    if (
      firstError?.status === "fulfilled" &&
      !firstError.value.ok
    ) {
      try {
        const errData = await firstError.value.json();
        errMsg = errData.message || errMsg;
      } catch {
        // keep default
      }
    }
    return new Response(JSON.stringify({ error: errMsg }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(
    JSON.stringify({
      ok: true,
      callsStarted: inserted.length,
      message: `${inserted.length} appel(s) NRP lancé(s). Dès qu'un lead décroche, vous serez appelé et la fiche s'ouvrira ici.`,
    }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
});
