/** Tailles de page proposées dans les listes de leads (admin + secrétaire). */
export const PER_PAGE_OPTIONS = [25, 50, 100, 200] as const;

export const DEFAULT_PER_PAGE = 50;

/** Mémorise la taille choisie. Lu côté serveur : la page se rend directement à la bonne taille. */
export const PER_PAGE_COOKIE = "leads_per_page";

export function parsePerPage(value: string | undefined | null): number {
  const parsed = Number(value);
  return (PER_PAGE_OPTIONS as readonly number[]).includes(parsed) ? parsed : DEFAULT_PER_PAGE;
}

export function parsePage(value: string | undefined | null): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 1 ? parsed : 1;
}

export function pageCount(total: number, per: number): number {
  return Math.max(1, Math.ceil(total / per));
}

export function clampPage(page: number, count: number): number {
  return Math.min(Math.max(page, 1), count);
}
