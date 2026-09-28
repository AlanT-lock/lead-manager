/** Paramètres d'URL du filtre « surface » des listes de leads. */
export const SURFACE_MIN_PARAM = "m2_min";
export const SURFACE_MAX_PARAM = "m2_max";

/** Lit une borne de surface (m²) depuis l'URL : nombre ≥ 0, sinon `null` (borne ignorée). */
export function parseSurfaceBound(value: string | null | undefined): number | null {
  if (value == null || value.trim() === "") return null;
  const n = Number(value.trim().replace(",", "."));
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/**
 * Bornes du filtre, remises dans l'ordre si l'utilisateur a saisi « de 150 à 80 ».
 * Une borne absente laisse la tranche ouverte de ce côté.
 */
export function parseSurfaceRange(
  min: string | null | undefined,
  max: string | null | undefined
): { min: number | null; max: number | null } {
  const a = parseSurfaceBound(min);
  const b = parseSurfaceBound(max);
  if (a != null && b != null && a > b) return { min: b, max: a };
  return { min: a, max: b };
}
