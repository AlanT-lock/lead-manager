import { NextResponse } from "next/server";

/**
 * Le lancement des appels NRP est géré par l'Edge Function Supabase (nrp-calls-start).
 * Aucune variable Vapi (VAPI_API_KEY) n'est nécessaire sur Vercel.
 * Le frontend appelle directement l'Edge Function avec le JWT du télépro.
 */
export async function POST() {
  return NextResponse.json(
    {
      error:
        "Utilisez l'Edge Function nrp-calls-start. Déployez-la avec supabase functions deploy nrp-calls-start.",
    },
    { status: 501 }
  );
}
