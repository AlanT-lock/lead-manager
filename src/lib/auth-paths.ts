/**
 * Chemins accessibles sans session.
 *
 * `/auth/` en fait partie : le lien de réinitialisation reçu par email arrive
 * forcément sans session, puisque c'est justement la route `/auth/confirm` qui
 * la crée. La protéger la rendrait inatteignable.
 */
export function isPublicAuthPath(pathname: string): boolean {
  return (
    pathname.startsWith("/login") ||
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/reset-password") ||
    pathname.startsWith("/auth/")
  );
}

/**
 * Formulaire SAV destiné aux clients : accessible sans session, et sans
 * redirection pour un utilisateur connecté (contrairement aux pages d'auth).
 * Ses routes d'API vivent sous /api/sav/ ; celles du personnel sont sous
 * /api/admin/sav/ et restent protégées.
 */
export function isPublicSavPath(pathname: string): boolean {
  return (
    pathname === "/demande-sav" ||
    pathname.startsWith("/demande-sav/") ||
    pathname.startsWith("/api/sav/")
  );
}
