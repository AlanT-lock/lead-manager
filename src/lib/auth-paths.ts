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
