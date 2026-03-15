import { NextRequest, NextResponse } from "next/server";
import { createClientFromRequest } from "@/lib/supabase/route-handler";

/**
 * Proxy vers l'Edge Function nrp-calls-start. Le frontend appelle cette route
 * (same-origin, pas de CORS), le serveur transmet le JWT à l'Edge Function.
 */
export async function POST(request: NextRequest) {
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  if (!baseUrl) {
    return NextResponse.json(
      { error: "Configuration Supabase manquante." },
      { status: 500 }
    );
  }

  const { supabase } = await createClientFromRequest(request);
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    return NextResponse.json(
      { error: "Session expirée. Reconnectez-vous." },
      { status: 401 }
    );
  }

  const edgeUrl = baseUrl.replace(/\/$/, "") + "/functions/v1/nrp-calls-start";
  const res = await fetch(edgeUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      "Content-Type": "application/json",
    },
  });
  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}
