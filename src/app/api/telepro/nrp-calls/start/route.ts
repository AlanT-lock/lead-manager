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

  const { supabase } = await createClientFromRequest(request);
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    return NextResponse.json(
      { error: "Session expirée. Reconnectez-vous." },
      { status: 401 }
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
    return NextResponse.json(
      {
        error: `Impossible de joindre l'Edge Function Supabase (${msg}). Vérifiez que NEXT_PUBLIC_SUPABASE_URL est bien configuré sur Netlify et que l'Edge Function nrp-calls-start est déployée.`,
      },
      { status: 502 }
    );
  }

  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}
