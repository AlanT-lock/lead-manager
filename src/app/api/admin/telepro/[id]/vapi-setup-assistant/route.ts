import { NextRequest, NextResponse } from "next/server";
import { createClientFromRequest } from "@/lib/supabase/route-handler";
import { createAdminClient } from "@/lib/supabase/admin";

const VAPI_API_URL = "https://api.vapi.ai";

const VOICE_ID_MAP: Record<string, string> = {
  charlotte: "XB0fDUnXU5powFXDhCwa",
  alice: "Xb7hH8MSUJpSbSDYk0k2",
  rachel: "21m00Tcm4TlvDq8ikWAM",
};

const DEFAULT_VOICE_ID = VOICE_ID_MAP.charlotte;

function resolveVoiceId(raw: string | null | undefined): string {
  const key = (raw ?? "").trim().toLowerCase();
  return VOICE_ID_MAP[key] ?? (key || DEFAULT_VOICE_ID);
}

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
      voiceId: resolveVoiceId(opts.voiceId),
    },
  };
  if (opts.firstMessageAudioUrl?.trim()) {
    payload.firstMessageAudioUrl = opts.firstMessageAudioUrl.trim();
  }
  return payload;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: teleproId } = await params;
  const { supabase } = await createClientFromRequest(request);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const adminClient = createAdminClient();
  const { data: profile } = await adminClient
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  const role = profile?.role?.toString().trim().toLowerCase();
  if (role !== "admin") {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const { data: telepro, error: teleproError } = await adminClient
    .from("profiles")
    .select("*")
    .eq("id", teleproId)
    .single();

  if (teleproError || !telepro) {
    return NextResponse.json({ error: "Télépro non trouvé" }, { status: 404 });
  }
  if (telepro.role?.toString().trim().toLowerCase() !== "telepro") {
    return NextResponse.json(
      { error: "L'utilisateur n'est pas un télépro" },
      { status: 400 }
    );
  }

  const apiKey = process.env.VAPI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "VAPI_API_KEY non configurée côté serveur. Ajoutez-la dans les variables d'environnement." },
      { status: 500 }
    );
  }

  const supabaseUrl =
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const webhookBase =
    process.env.VAPI_WEBHOOK_BASE_URL ||
    `${supabaseUrl.replace(/\/$/, "")}/functions/v1/vapi-webhook`;
  const serverUrl = webhookBase.replace(/\/$/, "");

  const payload = buildAssistantPayload({
    name: `NRP - ${telepro.full_name || "Télépro"}`,
    serverUrl,
    firstMessage: telepro.vapi_hold_message || "",
    firstMessageAudioUrl: telepro.first_message_audio_url,
    voiceId: telepro.vapi_voice_id?.trim() || "charlotte",
  });

  let assistantId: string;

  try {
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
        const errText = await updateRes.text().catch(() => "");
        return NextResponse.json(
          {
            error: "Vapi a refusé la mise à jour de l'assistant",
            details: errText.slice(0, 500),
          },
          { status: 502 }
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
        const errText = await createRes.text().catch(() => "");
        return NextResponse.json(
          {
            error: "Vapi a refusé la création de l'assistant",
            details: errText.slice(0, 500),
          },
          { status: 502 }
        );
      }
      const created = await createRes.json();
      assistantId = created.id;
      if (!assistantId) {
        return NextResponse.json(
          { error: "Vapi n'a pas renvoyé d'ID assistant" },
          { status: 502 }
        );
      }
      await adminClient
        .from("profiles")
        .update({ vapi_assistant_id: assistantId })
        .eq("id", teleproId);
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `Erreur réseau lors de l'appel Vapi: ${message}` },
      { status: 502 }
    );
  }

  return NextResponse.json({
    ok: true,
    assistantId,
    created: !telepro.vapi_assistant_id,
    message: telepro.vapi_assistant_id
      ? "Assistant Vapi mis à jour."
      : "Assistant Vapi créé. Pensez à enregistrer l'ID du numéro Twilio (Vapi > Phone Numbers) et à le renseigner ici.",
  });
}
