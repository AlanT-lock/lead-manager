import { describe, expect, it } from "vitest";
import { buildStatusCounts } from "@/lib/status-counts";
import { LEAD_CATEGORIES, LEAD_STATUSES_ADMIN } from "@/lib/types";

describe("buildStatusCounts", () => {
  it("remplit les compteurs à partir des lignes agrégées", () => {
    const counts = buildStatusCounts([
      { category: "fenetre", status: "nouveau", count: 12 },
      { category: "fenetre", status: "valide", count: 3 },
      { category: "clim_1euro", status: "nouveau", count: 7 },
    ]);

    expect(counts.fenetre.nouveau).toBe(12);
    expect(counts.fenetre.valide).toBe(3);
    expect(counts.clim_1euro.nouveau).toBe(7);
  });

  it("initialise à zéro toutes les combinaisons absentes du résultat SQL", () => {
    // Le GROUP BY n'émet aucune ligne pour un couple sans lead. Le Drawer attend
    // pourtant un nombre : sans cette initialisation, il afficherait « undefined ».
    const counts = buildStatusCounts([]);

    for (const cat of LEAD_CATEGORIES) {
      for (const s of LEAD_STATUSES_ADMIN) {
        expect(counts[cat][s]).toBe(0);
      }
    }
  });

  it("ignore les couples inconnus au lieu de les inventer", () => {
    // Un statut retiré du code mais encore en base ne doit pas créer de clé fantôme.
    const counts = buildStatusCounts([
      { category: "fenetre", status: "statut_supprime", count: 5 },
      { category: "categorie_inconnue", status: "nouveau", count: 9 },
    ]);

    expect(counts.fenetre).not.toHaveProperty("statut_supprime");
    expect(counts).not.toHaveProperty("categorie_inconnue");
  });

  it("accepte les count renvoyés en chaîne par PostgREST", () => {
    // bigint peut arriver en string selon la sérialisation : le Drawer additionne
    // ces valeurs, donc « 12 » + « 3 » donnerait « 123 » au lieu de 15.
    const counts = buildStatusCounts([
      { category: "fenetre", status: "nouveau", count: "12" as unknown as number },
    ]);

    expect(counts.fenetre.nouveau).toBe(12);
  });
});
