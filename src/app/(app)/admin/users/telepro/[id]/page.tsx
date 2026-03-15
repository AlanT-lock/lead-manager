import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { TeleproAgentConfigForm } from "./TeleproAgentConfigForm";

const VAPI_VOICE_OPTIONS = [
  { value: "charlotte", label: "Charlotte (français)" },
  { value: "alice", label: "Alice (français)" },
  { value: "rachel", label: "Rachel (multilingue)" },
] as const;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function safeStr(val: any): string {
  if (val === null || val === undefined) return "";
  return String(val);
}

export default async function TeleproAgentConfigPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: teleproId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const adminClient = createAdminClient();
  const { data: profile } = await adminClient
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  const role = profile?.role?.toString().trim().toLowerCase();
  if (role !== "admin") redirect("/admin");

  // Use select("*") to avoid errors if vapi columns don't exist yet (migrations 024/025)
  const { data: telepro, error } = await adminClient
    .from("profiles")
    .select("*")
    .eq("id", teleproId)
    .single();

  const roleLower = telepro?.role?.toString().trim().toLowerCase();
  if (error || !telepro || roleLower !== "telepro") {
    redirect("/admin/users");
  }

  return (
    <div className="space-y-6 max-w-xl">
      <div className="flex items-center gap-4">
        <Link
          href="/admin/users"
          className="p-2 rounded-lg hover:bg-slate-100 text-slate-600"
          aria-label="Retour aux utilisateurs"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            Agent IA — {telepro.full_name || telepro.email}
          </h1>
          <p className="text-slate-600 text-sm mt-0.5">
            Numéro Twilio (Vapi), numéro du télépro, message d&apos;attente,
            voix ou fichier audio.
          </p>
        </div>
      </div>

      <TeleproAgentConfigForm
        teleproId={telepro.id}
        teleproName={telepro.full_name || telepro.email}
        initial={{
          phone: safeStr(telepro.phone),
          vapi_phone_number_id: safeStr(telepro.vapi_phone_number_id),
          vapi_hold_message: safeStr(telepro.vapi_hold_message),
          vapi_voice_id: safeStr(telepro.vapi_voice_id) || "charlotte",
          first_message_audio_url: safeStr(telepro.first_message_audio_url),
        }}
        voiceOptions={VAPI_VOICE_OPTIONS}
      />
    </div>
  );
}
