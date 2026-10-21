import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type SessionUser = { id: string; email: string | null };

export type SessionProfile = {
  full_name: string | null;
  role: string;
  deleted_at: string | null;
} | null;

// Le middleware a déjà validé la session auprès de Supabase Auth (getUser) à
// chaque requête. Les layouts n'ont donc qu'à lire l'identité : getClaims()
// vérifie le JWT en local (clés asymétriques) au lieu d'un aller-retour réseau
// de ~1,7 s, et cache() partage le résultat entre les layouts imbriqués
// (app > admin | telepro) d'une même requête.
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) return null;
  return { id: claims.sub, email: typeof claims.email === "string" ? claims.email : null };
});

// Un seul SELECT profiles par requête, quel que soit le nombre de layouts.
export const getSessionProfile = cache(async (userId: string): Promise<SessionProfile> => {
  try {
    const res = await createAdminClient()
      .from("profiles")
      .select("full_name, role, deleted_at")
      .eq("id", userId)
      .single();
    return res.data;
  } catch {
    const supabase = await createClient();
    const res = await supabase
      .from("profiles")
      .select("full_name, role, deleted_at")
      .eq("id", userId)
      .single();
    return res.data;
  }
});

// Variante pour les route handlers : leur client lit la session depuis les
// cookies de la requête (createClientFromRequest) et le middleware a déjà
// validé cette session, donc inutile de rappeler Supabase Auth.
export async function getUserFromClient(
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<SessionUser | null> {
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) return null;
  return { id: claims.sub, email: typeof claims.email === "string" ? claims.email : null };
}
