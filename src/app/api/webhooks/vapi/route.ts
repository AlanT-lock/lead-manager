import { NextRequest, NextResponse } from "next/server";

/**
 * Webhook Vapi : la logique est déléguée à l'Edge Function Supabase (plus fiable pour les webhooks).
 * - Si SUPABASE_URL (ou NEXT_PUBLIC_SUPABASE_URL) est défini, on proxy vers l'Edge Function.
 * - Sinon, on exécute la logique ici en fallback (pour dev ou si Edge Function non déployée).
 */
const EDGE_FUNCTION_PATH = "/functions/v1/vapi-webhook";

async function proxyToEdgeFunction(request: NextRequest): Promise<NextResponse> {
  const baseUrl =
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!baseUrl) {
    return NextResponse.json(
      { error: "SUPABASE_URL non configuré pour le proxy webhook" },
      { status: 500 }
    );
  }
  const edgeUrl = baseUrl.replace(/\/$/, "") + EDGE_FUNCTION_PATH;
  const body = await request.text();
  const res = await fetch(edgeUrl, {
    method: "POST",
    headers: {
      "Content-Type": request.headers.get("Content-Type") || "application/json",
    },
    body: body || undefined,
  });
  const text = await res.text();
  return new NextResponse(text, {
    status: res.status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function POST(request: NextRequest) {
  const baseUrl =
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (baseUrl) {
    return proxyToEdgeFunction(request);
  }
  return NextResponse.json(
    {
      ok: false,
      message:
        "Configure SUPABASE_URL et déployez l'Edge Function vapi-webhook pour traiter le webhook.",
    },
    { status: 501 }
  );
}
