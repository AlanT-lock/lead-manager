import { NextRequest, NextResponse } from "next/server";
import { createClientFromRequest } from "@/lib/supabase/route-handler";

/**
 * Proxy vers l'Edge Function nrp-calls-start.
 * Flux : navigateur → cette route (Netlify) → Edge Function (Supabase) → Vapi.
 * Le serveur transmet le JWT à l'Edge Function pour éviter le CORS.
 */
export async function POST(request: NextRequest) {
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  if (!baseUrl) {
    return NextResponse.json(
      { error: "Configuration Supabase manquante (NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_URL sur Netlify)." },
      { status: 500 }
    );
  }

  const { supabase, supabaseResponse } = await createClientFromRequest(request);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { error: "Session expirée ou invalide. Reconnectez-vous." },
      { status: 401, headers: supabaseResponse.headers }
    );
  }
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    return NextResponse.json(
      { error: "Session expirée. Reconnectez-vous." },
      { status: 401, headers: supabaseResponse.headers }
    );
  }

  const edgeUrl = baseUrl.replace(/\/$/, "") + "/functions/v1/nrp-calls-start";
  let res: Response;
  try {
    res = await fetch(edgeUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Réseau";
    const errResponse = NextResponse.json(
      {
        error: `Impossible de joindre l'Edge Function Supabase (${msg}). Vérifiez que NEXT_PUBLIC_SUPABASE_URL est bien configuré sur Netlify et que l'Edge Function nrp-calls-start est déployée.`,
      },
      { status: 502 }
    );
    supabaseResponse.headers.forEach((value, key) => errResponse.headers.set(key, value));
    return errResponse;
  }

  const data = await res.json().catch(() => ({}));
  const response = NextResponse.json(data, { status: res.status });
  supabaseResponse.headers.forEach((value, key) => response.headers.set(key, value));
  return response;
}
