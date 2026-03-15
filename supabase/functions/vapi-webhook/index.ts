// Edge Function : webhook Vapi
// - status-update in-progress : lead a décroché → couper l'autre appel, transférer vers le télépro, ouvrir la fiche
// - status-update ended/no-answer/busy/failed : appel terminé sans décrochage → si tout le batch est terminé, notif "personne n'a répondu"

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const VAPI_API_URL = "https://api.vapi.ai";

/** Statuts Vapi indiquant qu'un appel est terminé sans que le lead ait décroché */
const ENDED_STATUSES = ["ended", "no-answer", "busy", "failed", "canceled"];

function normalizeTeleproPhone(phone: string): string {
  const s = (phone || "").trim();
  if (s.startsWith("+")) return s;
  const digits = s.replace(/\D/g, "");
  if (digits.length >= 9) return `+33${digits.slice(-9)}`;
  return s;
}

Deno.serve(async (req) => {
  console.log("[vapi-webhook] request received:", req.method);

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  let body: {
    message?: {
      type?: string;
      status?: string;
      call?: { id?: string; monitor?: { controlUrl?: string } };
      endedReason?: string;
    };
  };

  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const msg = body.message;
  const type = msg?.type;
  const status = msg?.status;
  const callId = msg?.call?.id;
  const endedReason = msg?.endedReason;

  console.log("[vapi-webhook] type:", type, "status:", status, "callId:", callId, "endedReason:", endedReason);

  if (type !== "status-update" || !callId) {
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, supabaseServiceKey);

  // ——— Appel terminé sans décrochage (ended, no-answer, busy, failed, voicemail) ———
  const isVoicemail = endedReason === "voicemail";
  if (ENDED_STATUSES.includes(status) || isVoicemail) {
    if (isVoicemail) {
      console.log("[vapi-webhook] voicemail detected for callId:", callId, "— hanging up, keeping other call");
    }

    const { data: row } = await admin
      .from("nrp_call_batches")
      .select("batch_id, telepro_id, lead_id")
      .eq("call_id", callId)
      .single();

    if (!row) {
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { batch_id, telepro_id, lead_id } = row;

    // Logger le résultat de l'appel NRP IA
    const logAction = isVoicemail
      ? "NRP IA - Messagerie vocale détectée"
      : `NRP IA - Pas de réponse (${status})`;
    await admin.from("lead_logs").insert({
      lead_id,
      user_id: telepro_id,
      action: logAction,
      old_status: "nrp",
      new_status: "nrp",
    });

    await admin.from("nrp_call_batches").delete().eq("call_id", callId);

    const { count } = await admin
      .from("nrp_call_batches")
      .select("id", { count: "exact", head: true })
      .eq("batch_id", batch_id);

    if (count === 0) {
      const { data: telepro } = await admin
        .from("profiles")
        .select("full_name")
        .eq("id", telepro_id)
        .single();
      const name = telepro?.full_name || "Télépro";
      const desc = isVoicemail
        ? `Télépro : ${name}. Un lead est tombé sur messagerie, l'autre n'a pas décroché.`
        : `Télépro : ${name}. Aucun des 2 leads NRP n'a décroché.`;
      await admin.from("rappels").insert({
        name: "NRP - Personne n'a répondu",
        description: desc,
        callback_at: new Date().toISOString(),
      });
      // Notifier le front que personne n'a répondu (lead_id = null)
      await admin.from("telepro_pending_lead_opens").upsert(
        { telepro_id, lead_id: null, created_at: new Date().toISOString() },
        { onConflict: "telepro_id" }
      );
    } else {
      console.log("[vapi-webhook] batch still has", count, "call(s) remaining — keeping them");
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  // ——— Lead a décroché (in-progress) ———
  if (status !== "in-progress") {
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  console.log("[vapi-webhook] lead picked up! callId:", callId);

  const { data: row, error: findError } = await admin
    .from("nrp_call_batches")
    .select("batch_id, telepro_id, lead_id, control_url")
    .eq("call_id", callId)
    .single();

  if (findError || !row) {
    console.log("[vapi-webhook] no batch row found for callId:", callId, "error:", findError?.message);
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { batch_id, telepro_id, lead_id, control_url } = row;

  // Logger que le lead a décroché via l'appel NRP IA
  await admin.from("lead_logs").insert({
    lead_id,
    user_id: telepro_id,
    action: "NRP IA - Lead a décroché, transfert vers le télépro",
    old_status: "nrp",
    new_status: "nrp",
  });

  const { data: otherRows } = await admin
    .from("nrp_call_batches")
    .select("call_id")
    .eq("batch_id", batch_id)
    .neq("call_id", callId);

  const apiKey = Deno.env.get("VAPI_API_KEY");
  if (apiKey && otherRows?.length) {
    await Promise.all(
      otherRows.map((r: { call_id: string }) =>
        fetch(`${VAPI_API_URL}/call/${r.call_id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${apiKey}` },
        })
      )
    );
  }

  await admin.from("nrp_call_batches").delete().eq("batch_id", batch_id);

  const { data: telepro } = await admin
    .from("profiles")
    .select("phone, vapi_hold_message")
    .eq("id", telepro_id)
    .single();

  const teleproPhone = telepro?.phone;
  const holdMessage =
    telepro?.vapi_hold_message ||
    "Un instant, nous vous mettons en relation avec un conseiller.";
  let controlUrlToUse = control_url ?? msg?.call?.monitor?.controlUrl;

  if (!controlUrlToUse && apiKey) {
    try {
      const callRes = await fetch(`${VAPI_API_URL}/call/${callId}`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (callRes.ok) {
        const callData = await callRes.json();
        controlUrlToUse = callData.monitor?.controlUrl ?? null;
      }
    } catch {
      // ignore
    }
  }

  console.log("[vapi-webhook] telepro phone:", teleproPhone, "controlUrl:", controlUrlToUse ? "present" : "MISSING");

  if (teleproPhone && controlUrlToUse) {
    const normalizedPhone = normalizeTeleproPhone(teleproPhone);
    console.log("[vapi-webhook] transferring to:", normalizedPhone);
    try {
      const transferRes = await fetch(`${controlUrlToUse}/control`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "transfer",
          destination: { type: "number", number: normalizedPhone },
          content: holdMessage,
        }),
      });
      console.log("[vapi-webhook] transfer response:", transferRes.status, await transferRes.text().catch(() => ""));
    } catch (err) {
      console.error("[vapi-webhook] transfer FAILED:", err instanceof Error ? err.message : err);
    }
  } else {
    console.warn("[vapi-webhook] CANNOT transfer: teleproPhone=", teleproPhone, "controlUrl=", controlUrlToUse);
  }

  if (teleproPhone && controlUrlToUse) {
    await admin.from("telepro_pending_lead_opens").upsert(
      { telepro_id, lead_id, created_at: new Date().toISOString() },
      { onConflict: "telepro_id" }
    );
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
