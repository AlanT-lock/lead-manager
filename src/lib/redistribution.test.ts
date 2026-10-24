import { describe, expect, it } from "vitest";
import {
  isExcludedFromRedistribution,
  parisDateString,
  parisEndOfDayIso,
  parseRedistributionLimit,
  planRedistribution,
  shuffle,
  type RedistributionCandidate,
} from "./redistribution";

/** Générateur pseudo-aléatoire déterministe pour des tests reproductibles. */
function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

function lead(id: string, current: string, past: string[] = []): RedistributionCandidate {
  return { id, currentTelepro: current, pastTelepros: new Set([current, ...past]) };
}

describe("shuffle", () => {
  it("garde les mêmes éléments sans modifier l'entrée", () => {
    const input = [1, 2, 3, 4, 5];
    const out = shuffle(input, seeded(1));
    expect(input).toEqual([1, 2, 3, 4, 5]);
    expect([...out].sort()).toEqual([1, 2, 3, 4, 5]);
  });
});

describe("planRedistribution", () => {
  it("ne renvoie jamais un lead à son télépro actuel", () => {
    const leads = Array.from({ length: 60 }, (_, i) => lead(`l${i}`, ["a", "b", "c"][i % 3]));
    const { assignments, unassigned } = planRedistribution(leads, ["a", "b", "c"], seeded(2));
    expect(unassigned).toEqual([]);
    expect(assignments).toHaveLength(60);
    for (const a of assignments) expect(a.to).not.toBe(a.from);
  });

  it("ne renvoie jamais un lead à un télépro qui l'a déjà eu", () => {
    const leads = [lead("l1", "a", ["b"]), lead("l2", "b", ["c"]), lead("l3", "c", ["a"])];
    for (let seed = 0; seed < 20; seed++) {
      const { assignments } = planRedistribution(leads, ["a", "b", "c"], seeded(seed));
      const byLead = Object.fromEntries(assignments.map((a) => [a.leadId, a.to]));
      expect(byLead).toEqual({ l1: "c", l2: "a", l3: "b" });
    }
  });

  it("laisse de côté les leads que tous les télépros ont déjà eus", () => {
    const { assignments, unassigned } = planRedistribution(
      [lead("l1", "a", ["b"]), lead("l2", "a")],
      ["a", "b"],
      seeded(3)
    );
    expect(unassigned).toEqual(["l1"]);
    expect(assignments).toEqual([{ leadId: "l2", from: "a", to: "b" }]);
  });

  it("répartit équitablement entre les télépros", () => {
    const leads = Array.from({ length: 90 }, (_, i) => lead(`l${i}`, ["a", "b", "c"][i % 3]));
    const { assignments } = planRedistribution(leads, ["a", "b", "c"], seeded(4));
    const counts: Record<string, number> = {};
    for (const a of assignments) counts[a.to] = (counts[a.to] ?? 0) + 1;
    expect(counts).toEqual({ a: 30, b: 30, c: 30 });
  });

  it("peut envoyer vers des télépros qui n'avaient aucun lead dans le lot", () => {
    const leads = [lead("l1", "a"), lead("l2", "a")];
    const { assignments } = planRedistribution(leads, ["a", "z"], seeded(5));
    expect(assignments.map((a) => a.to)).toEqual(["z", "z"]);
  });
});

describe("dates", () => {
  it("donne la veille en heure française", () => {
    // 24 oct. 2026 00:30 à Paris = 23 oct. 22:30 UTC
    const now = new Date("2026-10-23T22:30:00Z");
    expect(parisDateString(now)).toBe("2026-10-24");
    expect(parisDateString(now, -1)).toBe("2026-10-23");
  });

  it("calcule la fin de journée française en UTC", () => {
    expect(parisEndOfDayIso("2026-07-15")).toBe("2026-07-15T21:59:59.999Z");
    expect(parisEndOfDayIso("2026-12-15")).toBe("2026-12-15T22:59:59.999Z");
    expect(parisEndOfDayIso("2026-02-31")).toBeNull();
    expect(parisEndOfDayIso("abc")).toBeNull();
  });
});

describe("parseRedistributionLimit", () => {
  it("accepte uniquement des entiers raisonnables", () => {
    expect(parseRedistributionLimit(50)).toBe(50);
    expect(parseRedistributionLimit("20")).toBe(20);
    expect(parseRedistributionLimit(0)).toBeNull();
    expect(parseRedistributionLimit(1.5)).toBeNull();
    expect(parseRedistributionLimit("abc")).toBeNull();
    expect(parseRedistributionLimit(10_000)).toBeNull();
  });
});

describe("isExcludedFromRedistribution", () => {
  it("exclut thierry.eco69@gmail.com, quelle que soit la casse", () => {
    expect(isExcludedFromRedistribution("thierry.eco69@gmail.com")).toBe(true);
    expect(isExcludedFromRedistribution(" Thierry.Eco69@Gmail.com ")).toBe(true);
    expect(isExcludedFromRedistribution("autre@gmail.com")).toBe(false);
    expect(isExcludedFromRedistribution(null)).toBe(false);
  });
});
