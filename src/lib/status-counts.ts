import { LEAD_CATEGORIES, LEAD_STATUSES_ADMIN } from "@/lib/types";

export type StatusCountRow = {
  category: string;
  status: string;
  count: number;
};

/**
 * Reconstruit la structure attendue par le Drawer à partir des lignes agrégées
 * par `lead_status_counts`.
 *
 * Le GROUP BY n'émet pas de ligne pour les couples sans lead : toutes les
 * combinaisons sont donc initialisées à zéro, sinon le Drawer afficherait
 * « undefined » là où la boucle affichait 0.
 */
export function buildStatusCounts(rows: StatusCountRow[]): Record<string, Record<string, number>> {
  const counts: Record<string, Record<string, number>> = {};
  for (const cat of LEAD_CATEGORIES) {
    counts[cat] = {};
    for (const s of LEAD_STATUSES_ADMIN) counts[cat][s] = 0;
  }

  for (const row of rows) {
    // Un couple inconnu du code (statut retiré, catégorie ajoutée en base) est ignoré
    // plutôt que d'introduire une clé que le Drawer n'attend pas.
    if (row.category in counts && row.status in counts[row.category]) {
      counts[row.category][row.status] = Number(row.count);
    }
  }

  return counts;
}
