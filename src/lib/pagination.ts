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

/** Nombre de pages en deçà duquel on affiche tous les numéros, sans ellipse. */
const FULL_LIST_MAX_PAGES = 8;

/** Nombre de voisines affichées de part et d'autre de la page courante. */
const NEIGHBOURS = 2;

/**
 * Séquence de numéros à afficher, avec ellipses.
 * Exemple : pageNumbers(6, 25) -> [1, "ellipsis", 4, 5, 6, 7, 8, "ellipsis", 25]
 */
export function pageNumbers(current: number, total: number): (number | "ellipsis")[] {
  if (total <= FULL_LIST_MAX_PAGES) {
    return Array.from({ length: total }, (_, index) => index + 1);
  }

  const shown = new Set<number>([1, total]);
  for (let page = current - NEIGHBOURS; page <= current + NEIGHBOURS; page++) {
    if (page >= 1 && page <= total) shown.add(page);
  }

  const sorted = [...shown].sort((a, b) => a - b);
  const result: (number | "ellipsis")[] = [];

  for (const [index, page] of sorted.entries()) {
    if (index > 0) {
      const gap = page - sorted[index - 1];
      // Un trou d'une seule page : l'ellipse ne ferait rien gagner, on affiche le numéro.
      if (gap === 2) result.push(page - 1);
      else if (gap > 2) result.push("ellipsis");
    }
    result.push(page);
  }

  return result;
}

type PageResult<T> = { data: T[] | null; count: number | null };

/**
 * Récupère une page de leads en corrigeant une page hors bornes.
 *
 * Le nombre de pages n'est connu qu'après le `count` de la première requête : si la page demandée
 * n'existe plus (URL manipulée, filtre resserré, leads supprimés), on va chercher la dernière page
 * réelle plutôt que d'afficher un tableau vide.
 *
 * Subtilité PostgREST : quand l'offset dépasse le total et qu'un `count=exact` est demandé, la
 * réponse est un 416, et postgrest-js ne lit `content-range` que sur une réponse `ok` — `data` ET
 * `count` reviennent donc à `null`, et le total est perdu. Dans ce cas on sonde la page 1, toujours
 * satisfiable, pour récupérer le vrai total.
 *
 * `fetchPage` reçoit un numéro de page 1-indexé et applique lui-même filtres, tri et `.range()`.
 */
export async function fetchPaginatedLeads<T>(
  fetchPage: (page: number) => PromiseLike<PageResult<T>>,
  requestedPage: number,
  per: number
): Promise<{ leads: T[]; page: number; total: number }> {
  const first = await fetchPage(requestedPage);

  if (first.count !== null) {
    const total = first.count;
    const page = clampPage(requestedPage, pageCount(total, per));

    if (page === requestedPage) {
      return { leads: first.data ?? [], page, total };
    }

    const corrected = await fetchPage(page);
    return { leads: corrected.data ?? [], page, total };
  }

  // Pas de count exploitable : page hors bornes (416) ou requête en erreur.
  // La page 1 est toujours satisfiable et nous rend le vrai total.
  const probe = await fetchPage(1);
  const total = probe.count ?? 0;
  const page = clampPage(requestedPage, pageCount(total, per));

  if (page === 1) {
    return { leads: probe.data ?? [], page, total };
  }

  const corrected = await fetchPage(page);
  return { leads: corrected.data ?? [], page, total };
}
