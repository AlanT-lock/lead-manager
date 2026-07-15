import { type EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Valide le lien reçu par email et ouvre la session avant de rediriger.
 *
 * Le lien porte un `token_hash` à usage unique, vérifié ici côté serveur. Contrairement
 * au flux PKCE (`?code=`), rien n'est stocké sur l'appareil qui a fait la demande : le
 * lien reste donc valable si l'email est ouvert sur un autre appareil.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  const invalidLink = new URL("/reset-password", origin);
  invalidLink.searchParams.set("error", "lien_invalide");

  if (!tokenHash || !type) {
    return NextResponse.redirect(invalidLink);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });

  if (error) {
    return NextResponse.redirect(invalidLink);
  }

  // La session est posée en cookie : /reset-password peut appeler updateUser().
  return NextResponse.redirect(new URL("/reset-password", origin));
}
