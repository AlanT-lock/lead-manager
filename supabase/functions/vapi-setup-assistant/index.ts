// Edge Function : création ou mise à jour de l'assistant Vapi pour un télépro (appels NRP)
// Appelée depuis l'admin (page Utilisateurs > Configurer l'agent IA > bouton "Configurer l'assistant Vapi")

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const VAPI_API_URL = "https://api.vapi.ai";

// Config par défaut de l'assistant NRP (webhook + status-update)
// Si firstMessageAudioUrl est fourni, il est utilisé à la place du TTS pour le premier message.
function buildAssistantPayload(opts: {
  name: string;
  serverUrl: string;
  firstMessage: string;
  firstMessageAudioUrl?: string | null;
  voiceId: string;
}) {
  const holdMessage =
    opts.firstMessage?.trim() ||
    "Un instant, nous vous mettons en relation avec un conseiller.";
  const payload: Record<string, unknown> = {
    name: opts.name,
    firstMessage: holdMessage,
    server: { url: opts.serverUrl },
    serverMessages: ["status-update"],
    model: {
      provider: "openai",
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "Tu es un assistant vocal. Tu mets en relation l'appelant avec un conseiller. Dis uniquement le message d'attente configuré ; le transfert sera effectué automatiquement.",
        },
      ],
    },
    voice: {
      provider: "11labs",
      voiceId: opts.voiceId || "charlotte",
    },
  };
  if (opts.firstMessageAudioUrl?.trim()) {
    payload.firstMessageAudioUrl = opts.firstMessageAudioUrl.trim();
  }
  return payload;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { "Content-Type": "application/json" } }
    );
  }

  const authHeader = req.headers.get("Authorization");
  const token = authHeader?.replace("Bearer ", "");
  if (!token) {
    return new Response(
      JSON.stringify({ error: "Non authentifié" }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
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
    return new Response(
      JSON.stringify({ error: "Token invalide" }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  const admin = createClient(supabaseUrl, supabaseServiceKey);
  const { data: callerProfile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  const role = callerProfile?.role?.toString().trim().toLowerCase();
  if (role !== "admin") {
    return new Response(
      JSON.stringify({ error: "Accès refusé (admin uniquement)" }),
      { status: 403, headers: { "Content-Type": "application/json" } }
    );
  }

  let body: { teleproId?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "Body JSON invalide" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }
  const teleproId = body.teleproId;
  if (!teleproId) {
    return new Response(
      JSON.stringify({ error: "teleproId requis" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const { data: telepro, error: teleproError } = await admin
    .from("profiles")
    .select("id, full_name, vapi_assistant_id, vapi_hold_message, vapi_voice_id, first_message_audio_url")
    .eq("id", teleproId)
    .single();
  if (teleproError || !telepro) {
    return new Response(
      JSON.stringify({ error: "Télépro non trouvé" }),
      { status: 404, headers: { "Content-Type": "application/json" } }
    );
  }
  const roleRow = await admin
    .from("profiles")
    .select("role")
    .eq("id", teleproId)
    .single();
  if (roleRow.data?.role !== "telepro") {
    return new Response(
      JSON.stringify({ error: "L'utilisateur n'est pas un télépro" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const apiKey = Deno.env.get("VAPI_API_KEY");
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "VAPI_API_KEY non configuré côté serveur" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  const webhookBase =
    Deno.env.get("VAPI_WEBHOOK_BASE_URL") ||
    `${supabaseUrl}/functions/v1/vapi-webhook`;
  const serverUrl = webhookBase.replace(/\/$/, "");

  const payload = buildAssistantPayload({
    name: `NRP - ${telepro.full_name || "Télépro"}`,
    serverUrl,
    firstMessage: telepro.vapi_hold_message || "",
    firstMessageAudioUrl: telepro.first_message_audio_url,
    voiceId: telepro.vapi_voice_id?.trim() || "charlotte",
  });

  let assistantId: string;

  if (telepro.vapi_assistant_id) {
    const updateRes = await fetch(
      `${VAPI_API_URL}/assistant/${telepro.vapi_assistant_id}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: payload.name,
          firstMessage: payload.firstMessage,
          firstMessageAudioUrl: payload.firstMessageAudioUrl,
          server: payload.server,
          serverMessages: payload.serverMessages,
          voice: payload.voice,
        }),
      }
    );
    if (!updateRes.ok) {
      const errText = await updateRes.text();
      return new Response(
        JSON.stringify({
          error: "Vapi a refusé la mise à jour de l'assistant",
          details: errText.slice(0, 500),
        }),
        { status: 502, headers: { "Content-Type": "application/json" } }
      );
    }
    assistantId = telepro.vapi_assistant_id;
  } else {
    const createRes = await fetch(`${VAPI_API_URL}/assistant`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    if (!createRes.ok) {
      const errText = await createRes.text();
      return new Response(
        JSON.stringify({
          error: "Vapi a refusé la création de l'assistant",
          details: errText.slice(0, 500),
        }),
        { status: 502, headers: { "Content-Type": "application/json" } }
      );
    }
    const created = await createRes.json();
    assistantId = created.id;
    if (!assistantId) {
      return new Response(
        JSON.stringify({ error: "Vapi n'a pas renvoyé d'ID assistant" }),
        { status: 502, headers: { "Content-Type": "application/json" } }
      );
    }
    await admin
      .from("profiles")
      .update({ vapi_assistant_id: assistantId })
      .eq("id", teleproId);
  }

  return new Response(
    JSON.stringify({
      ok: true,
      assistantId,
      created: !telepro.vapi_assistant_id,
      message: telepro.vapi_assistant_id
        ? "Assistant Vapi mis à jour."
        : "Assistant Vapi créé. Pensez à enregistrer l'ID du numéro Twilio (Vapi > Phone Numbers) et à le renseigner ici.",
    }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
});
