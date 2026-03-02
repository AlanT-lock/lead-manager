import { createClient } from "@supabase/supabase-js";

/**
 * Client Supabase avec service role - bypass RLS.
 * Utilisé pour lire le rôle utilisateur de manière fiable.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY manquant");
  }
  return createClient(url, key);
}
