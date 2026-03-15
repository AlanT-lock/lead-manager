import { NextRequest, NextResponse } from "next/server";

/**
 * Proxy vers l'Edge Function nrp-calls-start.
 * Le frontend envoie le token Supabase dans le header Authorization.
 * Cette route le transmet tel quel à l'Edge Function (pas de CORS).
 */
export async function POST(request: NextRequest) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
    if (!baseUrl) {
      return NextResponse.json(
        { error: "NEXT_PUBLIC_SUPABASE_URL non configuré sur le serveur." },
        { status: 500 }
      );
    }

    const authHeader = request.headers.get("Authorization");
    if (!authHeader) {
      return NextResponse.json(
        { error: "Token manquant. Reconnectez-vous." },
        { status: 401 }
      );
    }

    const edgeUrl = `${baseUrl.replace(/\/$/, "")}/functions/v1/nrp-calls-start`;
    const res = await fetch(edgeUrl, {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
    });

    const text = await res.text();
    let data: Record<string, unknown>;
    try {
      data = JSON.parse(text);
    } catch {
      data = { error: `Edge Function a répondu ${res.status}: ${text.slice(0, 300)}` };
    }

    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `Erreur serveur proxy: ${message}` },
      { status: 500 }
    );
  }
}
