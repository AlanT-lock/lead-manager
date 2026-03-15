// Edge Function : lancer 2 appels NRP pour le télépro connecté (remplace la route Next.js pour éviter VAPI_API_KEY sur Vercel)

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const VAPI_API_URL = "https://api.vapi.ai";

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, Authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

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
  console.log("[nrp-calls-start] request method:", req.method);

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const authHeader = req.headers.get("Authorization");
  const token = authHeader?.replace("Bearer ", "");
  if (!token) {
    console.log("[nrp-calls-start] missing Authorization");
    return jsonResponse({ error: "Non authentifié" }, 401);
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
    console.log("[nrp-calls-start] auth failed:", userError?.message ?? "no user");
    return jsonResponse({ error: "Token invalide" }, 401);
  }
  console.log("[nrp-calls-start] user:", user.id);

  const admin = createClient(supabaseUrl, supabaseServiceKey);
  const { data: profile } = await admin
    .from("profiles")
    .select("role, phone, vapi_assistant_id, vapi_phone_number_id, vapi_hold_message")
    .eq("id", user.id)
    .single();

  const role = profile?.role?.toString().trim().toLowerCase();
  if (role !== "telepro") {
    console.log("[nrp-calls-start] role not telepro:", role);
    return jsonResponse({ error: "Réservé aux télépros" }, 403);
  }

  const apiKey = Deno.env.get("VAPI_API_KEY");
  if (!apiKey) {
    console.log("[nrp-calls-start] VAPI_API_KEY not set");
    return jsonResponse({ error: "Configuration Vapi manquante côté serveur" }, 500);
  }

  if (
    !profile!.vapi_assistant_id ||
    !profile!.vapi_phone_number_id ||
    !profile!.phone
  ) {
    console.log("[nrp-calls-start] vapi/phone config missing for user");
    return jsonResponse({
      error:
        "Votre agent IA et/ou numéro ne sont pas configurés. Demandez à l'admin de les renseigner dans Utilisateurs.",
    }, 400);
  }

  // Prioriser les leads jamais appelés par l'IA (null en premier), puis les plus anciennement appelés
  const { data: nrpLeads } = await admin
    .from("leads")
    .select("id, phone")
    .eq("assigned_to", user.id)
    .eq("status", "nrp")
    .order("last_nrp_ai_call_at", { ascending: true, nullsFirst: true })
    .order("nrp_count", { ascending: true })
    .order("created_at", { ascending: true })
    .limit(2);

  if (!nrpLeads?.length) {
    console.log("[nrp-calls-start] no NRP leads for user");
    return jsonResponse({ error: "Aucun lead NRP à appeler pour le moment." }, 400);
  }
  console.log("[nrp-calls-start] launching", nrpLeads.length, "call(s) for leads:", nrpLeads.map((l) => l.id));

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
    // Log l'appel NRP IA + mise à jour de la date du dernier appel
    await admin.from("lead_logs").insert({
      lead_id: lead.id,
      user_id: user.id,
      action: "NRP IA - Appel lancé par l'agent IA",
      old_status: "nrp",
      new_status: "nrp",
    });
    await admin
      .from("leads")
      .update({ last_nrp_ai_call_at: new Date().toISOString() })
      .eq("id", lead.id);
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
    console.log("[nrp-calls-start] Vapi call(s) failed:", errMsg);
    return jsonResponse({ error: errMsg }, 502);
  }

  console.log("[nrp-calls-start] success, inserted:", inserted.length);
  return jsonResponse({
    ok: true,
    callsStarted: inserted.length,
    message: `${inserted.length} appel(s) NRP lancé(s). Dès qu'un lead décroche, vous serez appelé et la fiche s'ouvrira ici.`,
  }, 200);
});
