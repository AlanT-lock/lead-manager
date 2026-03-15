import { NextResponse } from "next/server";

/**
 * En dev uniquement : affiche ce que le serveur voit pour la config Supabase.
 * Ouvre http://localhost:3000/api/debug-supabase-config dans le navigateur.
 */
export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const hasKey = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const isInvalid =
    !url || url.includes("xxxxx") || url.includes("placeholder");

  return NextResponse.json({
    hasUrl: !!url,
    urlPrefix: url ? url.slice(0, 50) + "..." : "(vide)",
    hasAnonKey: hasKey,
    isInvalid,
    message: isInvalid
      ? "Le serveur n'a pas une config valide. Lancez 'npm run dev' depuis le dossier du projet (celui qui contient .env.local)."
      : "OK",
  });
}
