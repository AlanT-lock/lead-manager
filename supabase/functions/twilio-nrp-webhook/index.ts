// Edge Function : webhook Twilio pour NRP (TwiML hold, transfer, status callback, inbound)
// - action=hold : TwiML message d'attente en boucle
// - action=transfer&batch_id= : TwiML Dial vers le télépro
// - StatusCallback (AnsweredBy) : humain → transfert, messagerie → raccrocher
// - Inbound : appel entrant sur le numéro Twilio → Dial vers le télépro

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const TWILIO_API_BASE = "https://api.twilio.com/2010-04-01";

function twimlResponse(xml: string) {
  return new Response(xml, {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
}

/**
 * Normalise un numéro vers E.164 pour Twilio.
 * Gère : +3364664..., p:+33663397057, 064664..., 33..., 9 chiffres.
 */
function normalizePhone(phone: string): string {
  let s = (phone ?? "").trim();
  if (!s) return s;
  if (s.toLowerCase().startsWith("p:")) s = s.slice(2).trim();
  const digits = s.replace(/\D/g, "");
  if (digits.length === 0) return s;
  if (s.startsWith("+33") && digits.length >= 11) return "+33" + digits.slice(-9);
  if (s.startsWith("+") && digits.length >= 10) return s;
  if (digits.startsWith("33") && digits.length === 11) return "+" + digits;
  if (digits.length === 10 && digits[0] === "0") return "+33" + digits.slice(1);
  if (digits.length === 9) return "+33" + digits;
  if (digits.length >= 9) return "+33" + digits.slice(-9);
  return s;
}

/** Échappe une URL pour l’inclusion dans du XML TwiML (Redirect, etc.). */
function urlForTwiml(href: string): string {
  return href.replace(/&/g, "&amp;");
}

/** Échappe le texte pour un élément <Say> (XML). */
function escapeSayText(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

const DEFAULT_VOICE = "Polly.Remi-Neural";

/** Voix Twilio pour <Say> : profil (si non vide) > secret TWILIO_SAY_VOICE > défaut. */
function getSayVoice(profileVoice?: string | null): string {
  const fromProfile = (profileVoice ?? "").trim();
  if (fromProfile) return fromProfile;
  const fromEnv = (Deno.env.get("TWILIO_SAY_VOICE") ?? "").trim();
  if (fromEnv) return fromEnv;
  return DEFAULT_VOICE;
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const action = url.searchParams.get("action");

  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST",
        "Access-Control-Allow-Headers": "content-type",
      },
    });
  }

  try {
  let body: Record<string, string> = {};
  try {
    if (req.method === "POST") {
      const text = await req.text();
      if (text) {
        body = Object.fromEntries(new URLSearchParams(text)) as Record<string, string>;
      }
    }
  } catch {
    // ignore
  }

  const CallSid = body.CallSid ?? url.searchParams.get("CallSid");
  const CallStatus = body.CallStatus ?? url.searchParams.get("CallStatus");
  const AnsweredBy = (body.AnsweredBy ?? url.searchParams.get("AnsweredBy"))?.toLowerCase();
  const From = body.From ?? url.searchParams.get("From");
  const To = body.To ?? url.searchParams.get("To");
  const batchIdParam = url.searchParams.get("batch_id");

  // Log chaque requête pour tracer le flux (sinon on ne voit que booted/shutdown)
  console.log("[twilio-nrp-webhook]", req.method, url.pathname + url.search, {
    action,
    CallSid: CallSid ?? null,
    AnsweredBy: AnsweredBy ?? null,
    CallStatus: CallStatus ?? null,
    From: From ?? null,
    To: To ?? null,
  });

  // ——— action=hold SANS AnsweredBy : message d'attente configurable (vapi_hold_message) + boucle
  // Premier contact hold : on essaie de récupérer le message + la voix du télépro (si on trouve le batch), sinon on tombe sur les valeurs par défaut.
  if (action === "hold" && CallSid && !AnsweredBy) {
    let holdMsg = "Un instant, nous vous mettons en relation avec un conseiller.";
    let voice = getSayVoice();
    try {
      const supabaseUrlEnv = Deno.env.get("SUPABASE_URL");
      const supabaseServiceKeyEnv = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      if (supabaseUrlEnv && supabaseServiceKeyEnv) {
        const adminForHold = createClient(supabaseUrlEnv, supabaseServiceKeyEnv);
        const { data: row } = await adminForHold
          .from("nrp_call_batches")
          .select("telepro_id")
          .eq("call_id", CallSid)
          .single();
        if (row?.telepro_id) {
          const { data: profile } = await adminForHold
            .from("profiles")
            .select("vapi_hold_message, twilio_say_voice")
            .eq("id", row.telepro_id)
            .single();
          if (profile?.vapi_hold_message?.trim()) holdMsg = profile.vapi_hold_message.trim();
          voice = getSayVoice(profile?.twilio_say_voice ?? undefined);
        }
      }
    } catch {
      // en cas d'erreur DB, on garde les valeurs par défaut
    }
    const baseUrl = Deno.env.get("TWILIO_WEBHOOK_BASE_URL") ?? (url.origin + url.pathname);
    const holdRedirectUrl = `${baseUrl}?action=hold`;
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="${voice}" language="fr-FR">${escapeSayText(holdMsg)}</Say>
  <Pause length="5"/>
  <Redirect method="POST">${urlForTwiml(holdRedirectUrl)}</Redirect>
</Response>`;
    console.log("[twilio-nrp-webhook] NRP hold: TwiML voix + redirect (msg/voix télépro si trouvés)");
    return twimlResponse(xml);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, supabaseServiceKey);

  // ——— StatusCallback (?action=status) : Twilio envoie statut et AnsweredBy
  if (action === "status" && CallSid) {

    const { data: row } = await admin
      .from("nrp_call_batches")
      .select("batch_id, telepro_id, lead_id")
      .eq("call_id", CallSid)
      .single();

    if (row && AnsweredBy) {
      const { batch_id, telepro_id, lead_id } = row;
      const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
      const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
      // Twilio renvoie souvent "unknown" quand un humain décroche (AMD incertain) → on tente le transfert
      const isHuman = AnsweredBy === "human" || AnsweredBy === "unknown";
      const isMachine =
        AnsweredBy === "machine_start" ||
        AnsweredBy === "machine_end_beep" ||
        AnsweredBy === "machine_end_silence" ||
        AnsweredBy === "machine_end_other" ||
        AnsweredBy === "fax";

      if (isHuman) {
        const { error: claimErr } = await admin.from("nrp_batch_transferred").insert({ batch_id });
        if (claimErr) {
          const conflict = claimErr.code === "23505";
          if (conflict) {
            await admin.from("nrp_call_batches").delete().eq("call_id", CallSid);
            await admin.from("lead_logs").insert({
              lead_id,
              user_id: telepro_id,
              action: "NRP Twilio - Autre lead transféré en premier",
              old_status: "nrp",
              new_status: "nrp",
            });
            if (accountSid && authToken) {
              await fetch(`${TWILIO_API_BASE}/Accounts/${accountSid}/Calls/${CallSid}.json`, {
                method: "POST",
                headers: {
                  Authorization: "Basic " + btoa(`${accountSid}:${authToken}`),
                  "Content-Type": "application/x-www-form-urlencoded",
                },
                body: new URLSearchParams({ Status: "completed" }).toString(),
              });
            }
            return twimlResponse('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
          }
        }

        const otherRows = await admin.from("nrp_call_batches").select("call_id").eq("batch_id", batch_id).neq("call_id", CallSid);
        if (accountSid && authToken) {
          for (const r of otherRows.data ?? []) {
            await fetch(`${TWILIO_API_BASE}/Accounts/${accountSid}/Calls/${r.call_id}.json`, {
              method: "POST",
              headers: {
                Authorization: "Basic " + btoa(`${accountSid}:${authToken}`),
                "Content-Type": "application/x-www-form-urlencoded",
              },
              body: new URLSearchParams({ Status: "completed" }).toString(),
            });
          }
        }
        await admin.from("nrp_call_batches").delete().eq("batch_id", batch_id);

        const baseUrl = Deno.env.get("TWILIO_WEBHOOK_BASE_URL") ?? supabaseUrl.replace(/\/$/, "") + "/functions/v1/twilio-nrp-webhook";
        const transferUrl = `${baseUrl}?action=transfer&telepro_id=${telepro_id}`;

        if (accountSid && authToken) {
          await fetch(`${TWILIO_API_BASE}/Accounts/${accountSid}/Calls/${CallSid}.json`, {
            method: "POST",
            headers: {
              Authorization: "Basic " + btoa(`${accountSid}:${authToken}`),
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({ Url: transferUrl, Method: "POST" }).toString(),
          });
        }

        await admin.from("telepro_pending_lead_opens").upsert(
          { telepro_id, lead_id, created_at: new Date().toISOString() },
          { onConflict: "telepro_id" }
        );
        await admin.from("lead_logs").insert({
          lead_id,
          user_id: telepro_id,
          action: "NRP Twilio - Lead décroché (humain), transfert vers télépro",
          old_status: "nrp",
          new_status: "nrp",
        });
      } else if (isMachine || AnsweredBy) {
        await admin.from("nrp_call_batches").delete().eq("call_id", CallSid);
        await admin.from("lead_logs").insert({
          lead_id,
          user_id: telepro_id,
          action: "NRP Twilio - Messagerie détectée",
          old_status: "nrp",
          new_status: "nrp",
        });
        if (accountSid && authToken) {
          await fetch(`${TWILIO_API_BASE}/Accounts/${accountSid}/Calls/${CallSid}.json`, {
            method: "POST",
            headers: {
              Authorization: "Basic " + btoa(`${accountSid}:${authToken}`),
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({ Status: "completed" }).toString(),
          });
        }

        const { count } = await admin.from("nrp_call_batches").select("id", { count: "exact", head: true }).eq("batch_id", batch_id);
        const { data: transferred } = await admin.from("nrp_batch_transferred").select("batch_id").eq("batch_id", batch_id).maybeSingle();
        if ((count ?? 0) === 0 && !transferred) {
          const { data: telepro } = await admin.from("profiles").select("full_name").eq("id", telepro_id).single();
          await admin.from("rappels").insert({
            name: "NRP - Personne n'a répondu",
            description: `Télépro : ${telepro?.full_name || "Télépro"}. Aucun des 2 leads NRP n'a décroché (humain).`,
            callback_at: new Date().toISOString(),
          });
          await admin.from("telepro_pending_lead_opens").upsert(
            { telepro_id, lead_id: null, created_at: new Date().toISOString() },
            { onConflict: "telepro_id" }
          );
        }
      }
    }

    if (CallStatus === "completed" || CallStatus === "no-answer" || CallStatus === "busy" || CallStatus === "failed" || CallStatus === "canceled") {
      const { data: row2 } = await admin.from("nrp_call_batches").select("batch_id, telepro_id, lead_id").eq("call_id", CallSid).single();
      if (row2) {
        await admin.from("nrp_call_batches").delete().eq("call_id", CallSid);
        const { count } = await admin.from("nrp_call_batches").select("id", { count: "exact", head: true }).eq("batch_id", row2.batch_id);
        const { data: transferred } = await admin.from("nrp_batch_transferred").select("batch_id").eq("batch_id", row2.batch_id).maybeSingle();
        if ((count ?? 0) === 0 && !transferred) {
          const { data: telepro } = await admin.from("profiles").select("full_name").eq("id", row2.telepro_id).single();
          await admin.from("rappels").insert({
            name: "NRP - Personne n'a répondu",
            description: `Télépro : ${telepro?.full_name || "Télépro"}. Aucun des 2 leads NRP n'a décroché.`,
            callback_at: new Date().toISOString(),
          });
          await admin.from("telepro_pending_lead_opens").upsert(
            { telepro_id: row2.telepro_id, lead_id: null, created_at: new Date().toISOString() },
            { onConflict: "telepro_id" }
          );
        }
      }
    }
    return twimlResponse('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
  }

  // ——— action=hold : message d'attente en boucle, ou (si AnsweredBy présent) transfert / raccrochage
  if (action === "hold" && CallSid) {
    if (AnsweredBy) {
      const { data: row } = await admin.from("nrp_call_batches").select("batch_id, telepro_id, lead_id").eq("call_id", CallSid).single();
      if (row) {
        const { batch_id, telepro_id, lead_id } = row;
        const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
        const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
        // Twilio renvoie souvent "unknown" quand un humain décroche (AMD incertain) → on tente le transfert
        const isHuman = AnsweredBy === "human" || AnsweredBy === "unknown";
        const isMachine = ["machine_start", "machine_end_beep", "machine_end_silence", "machine_end_other", "fax"].includes(AnsweredBy);

        if (isHuman) {
          const { error: claimErr } = await admin.from("nrp_batch_transferred").insert({ batch_id });
          if (claimErr?.code === "23505") {
            await admin.from("nrp_call_batches").delete().eq("call_id", CallSid);
            await admin.from("lead_logs").insert({ lead_id, user_id: telepro_id, action: "NRP Twilio - Autre lead transféré en premier", old_status: "nrp", new_status: "nrp" });
            if (accountSid && authToken) {
              await fetch(`${TWILIO_API_BASE}/Accounts/${accountSid}/Calls/${CallSid}.json`, {
                method: "POST",
                headers: { Authorization: "Basic " + btoa(`${accountSid}:${authToken}`), "Content-Type": "application/x-www-form-urlencoded" },
                body: new URLSearchParams({ Status: "completed" }).toString(),
              });
            }
            return twimlResponse('<?xml version="1.0" encoding="UTF-8"?><Response><Hangup/></Response>');
          }
          const otherRows = await admin.from("nrp_call_batches").select("call_id").eq("batch_id", batch_id).neq("call_id", CallSid);
          if (accountSid && authToken) {
            for (const r of otherRows.data ?? []) {
              await fetch(`${TWILIO_API_BASE}/Accounts/${accountSid}/Calls/${r.call_id}.json`, {
                method: "POST",
                headers: { Authorization: "Basic " + btoa(`${accountSid}:${authToken}`), "Content-Type": "application/x-www-form-urlencoded" },
                body: new URLSearchParams({ Status: "completed" }).toString(),
              });
            }
          }
          await admin.from("nrp_call_batches").delete().eq("batch_id", batch_id);
          await admin.from("telepro_pending_lead_opens").upsert({ telepro_id, lead_id, created_at: new Date().toISOString() }, { onConflict: "telepro_id" });
          await admin.from("lead_logs").insert({ lead_id, user_id: telepro_id, action: "NRP Twilio - Lead décroché (humain), transfert vers télépro", old_status: "nrp", new_status: "nrp" });
          const baseUrl = Deno.env.get("TWILIO_WEBHOOK_BASE_URL") ?? (url.origin + url.pathname);
          const transferUrl = `${baseUrl}?action=transfer&telepro_id=${telepro_id}`;
          console.log("[twilio-nrp-webhook] NRP hold → redirect transfer", { telepro_id, transferUrl });
          return twimlResponse(`<?xml version="1.0" encoding="UTF-8"?><Response><Redirect method="POST">${urlForTwiml(transferUrl)}</Redirect></Response>`);
        }
        if (isMachine) {
          await admin.from("nrp_call_batches").delete().eq("call_id", CallSid);
          await admin.from("lead_logs").insert({ lead_id, user_id: telepro_id, action: "NRP Twilio - Messagerie détectée", old_status: "nrp", new_status: "nrp" });
          if (accountSid && authToken) {
            await fetch(`${TWILIO_API_BASE}/Accounts/${accountSid}/Calls/${CallSid}.json`, {
              method: "POST",
              headers: { Authorization: "Basic " + btoa(`${accountSid}:${authToken}`), "Content-Type": "application/x-www-form-urlencoded" },
              body: new URLSearchParams({ Status: "completed" }).toString(),
            });
          }
          const { count } = await admin.from("nrp_call_batches").select("id", { count: "exact", head: true }).eq("batch_id", batch_id);
          const { data: transferred } = await admin.from("nrp_batch_transferred").select("batch_id").eq("batch_id", batch_id).maybeSingle();
          if ((count ?? 0) === 0 && !transferred) {
            const { data: telepro } = await admin.from("profiles").select("full_name").eq("id", telepro_id).single();
            await admin.from("rappels").insert({ name: "NRP - Personne n'a répondu", description: `Télépro : ${telepro?.full_name || "Télépro"}. Les 2 leads NRP messagerie ou pas de réponse.`, callback_at: new Date().toISOString() });
            await admin.from("telepro_pending_lead_opens").upsert({ telepro_id, lead_id: null, created_at: new Date().toISOString() }, { onConflict: "telepro_id" });
          }
          return twimlResponse('<?xml version="1.0" encoding="UTF-8"?><Response><Hangup/></Response>');
        }
      }
    }
  }

  // ——— action=transfer&telepro_id= : Dial vers le télépro
  const teleproIdParam = url.searchParams.get("telepro_id");
  if (action === "transfer" && (teleproIdParam || batchIdParam)) {
    const tid = teleproIdParam ?? (batchIdParam ? (await admin.from("nrp_call_batches").select("telepro_id").eq("batch_id", batchIdParam).limit(1).single()).data?.telepro_id : null);
    if (!tid) {
      console.log("[twilio-nrp-webhook] transfer: pas de telepro_id");
      return twimlResponse('<?xml version="1.0" encoding="UTF-8"?><Response><Hangup/></Response>');
    }
    const { data: profile } = await admin.from("profiles").select("phone, twilio_phone_number").eq("id", tid).single();
    const teleproPhone = profile?.phone ? normalizePhone(profile.phone) : null;
    if (!teleproPhone) {
      console.log("[twilio-nrp-webhook] transfer: pas de numéro télépro", { telepro_id: tid });
      return twimlResponse('<?xml version="1.0" encoding="UTF-8"?><Response><Hangup/></Response>');
    }
    const callerId = To?.trim() || (profile?.twilio_phone_number ? normalizePhone(profile.twilio_phone_number) : "") || "";
    console.log("[twilio-nrp-webhook] NRP transfer → Dial télépro", { telepro_id: tid, teleproPhone, callerId: callerId || "(Twilio default)" });
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial timeout="30" callerId="${callerId}">
    <Number>${teleproPhone}</Number>
  </Dial>
  <Hangup/>
</Response>`;
    return twimlResponse(xml);
  }

  // ——— Inbound : appel entrant sur le numéro Twilio → message puis transfert vers le télépro
  if (!action && To && From) {
    const toNorm = normalizePhone(To);
    console.log("[twilio-nrp-webhook] Inbound: To=" + To + " -> normalized=" + toNorm);
    let profile: { id: string; phone: string; vapi_hold_message?: string; twilio_say_voice?: string } | null = null;
    // limit(1) au lieu de maybeSingle() : si plusieurs télépros ont le même numéro Twilio, on prend le premier
    const { data: rows } = await admin.from("profiles").select("id, phone, vapi_hold_message, twilio_say_voice").eq("twilio_phone_number", toNorm).eq("role", "telepro").limit(1);
    if (rows?.[0]) profile = rows[0];
    if (!profile && To !== toNorm) {
      const { data: rows2 } = await admin.from("profiles").select("id, phone, vapi_hold_message, twilio_say_voice").eq("twilio_phone_number", To.trim()).eq("role", "telepro").limit(1);
      if (rows2?.[0]) profile = rows2[0];
    }
    if (profile?.phone) {
      const inboundMsg = profile?.vapi_hold_message?.trim() || "Un instant, nous vous mettons en relation.";
      const voice = getSayVoice(profile?.twilio_say_voice);
      console.log("[twilio-nrp-webhook] Inbound: transfert vers telepro " + profile.phone);
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="${voice}" language="fr-FR">${escapeSayText(inboundMsg)}</Say>
  <Dial timeout="30">
    <Number>${normalizePhone(profile.phone)}</Number>
  </Dial>
  <Hangup/>
</Response>`;
      return twimlResponse(xml);
    }
    const { data: allTwilio } = await admin.from("profiles").select("twilio_phone_number").eq("role", "telepro").not("twilio_phone_number", "is", null);
    const numbers = (allTwilio ?? []).map((r) => r.twilio_phone_number).filter(Boolean);
    console.log("[twilio-nrp-webhook] Inbound: aucun profil pour To=" + toNorm + ". Numéros Twilio en BDD: " + JSON.stringify(numbers));
  }

  return twimlResponse('<?xml version="1.0" encoding="UTF-8"?><Response><Hangup/></Response>');

  } catch (e) {
    console.error("[twilio-nrp-webhook] error", e);
    const voice = getSayVoice();
    return twimlResponse(
      `<?xml version="1.0" encoding="UTF-8"?><Response><Say voice="${voice}" language="fr-FR">Une erreur s'est produite. Au revoir.</Say><Hangup/></Response>`
    );
  }
});
