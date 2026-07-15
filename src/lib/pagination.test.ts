import { describe, expect, it } from "vitest";
import {
  DEFAULT_PER_PAGE,
  PER_PAGE_OPTIONS,
  clampPage,
  fetchPaginatedLeads,
  pageCount,
  pageNumbers,
  parsePage,
  parsePerPage,
} from "@/lib/pagination";

describe("parsePerPage", () => {
  it("accepte les tailles autorisées", () => {
    for (const option of PER_PAGE_OPTIONS) {
      expect(parsePerPage(String(option))).toBe(option);
    }
  });

  it("retombe sur le défaut si absent", () => {
    expect(parsePerPage(undefined)).toBe(DEFAULT_PER_PAGE);
    expect(parsePerPage(null)).toBe(DEFAULT_PER_PAGE);
    expect(parsePerPage("")).toBe(DEFAULT_PER_PAGE);
  });

  it("rejette une taille hors liste ou absurde", () => {
    expect(parsePerPage("37")).toBe(DEFAULT_PER_PAGE);
    expect(parsePerPage("0")).toBe(DEFAULT_PER_PAGE);
    expect(parsePerPage("-50")).toBe(DEFAULT_PER_PAGE);
    expect(parsePerPage("abc")).toBe(DEFAULT_PER_PAGE);
    expect(parsePerPage("1000000")).toBe(DEFAULT_PER_PAGE);
  });
});

describe("parsePage", () => {
  it("lit un numéro de page valide", () => {
    expect(parsePage("1")).toBe(1);
    expect(parsePage("7")).toBe(7);
  });

  it("retombe sur 1 pour tout le reste", () => {
    expect(parsePage(undefined)).toBe(1);
    expect(parsePage("0")).toBe(1);
    expect(parsePage("-5")).toBe(1);
    expect(parsePage("abc")).toBe(1);
    expect(parsePage("1.5")).toBe(1);
  });
});

describe("pageCount", () => {
  it("arrondit au supérieur", () => {
    expect(pageCount(100, 50)).toBe(2);
    expect(pageCount(101, 50)).toBe(3);
  });

  it("renvoie toujours au moins 1 page", () => {
    expect(pageCount(0, 50)).toBe(1);
    expect(pageCount(10, 50)).toBe(1);
  });
});

describe("clampPage", () => {
  it("ramène dans les bornes", () => {
    expect(clampPage(8, 3)).toBe(3);
    expect(clampPage(0, 3)).toBe(1);
    expect(clampPage(2, 3)).toBe(2);
  });
});

describe("pageNumbers", () => {
  it("affiche tous les numéros jusqu'à 8 pages", () => {
    expect(pageNumbers(1, 1)).toEqual([1]);
    expect(pageNumbers(3, 5)).toEqual([1, 2, 3, 4, 5]);
    expect(pageNumbers(4, 8)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it("condense autour de la page courante au-delà de 8 pages", () => {
    expect(pageNumbers(6, 25)).toEqual([1, "ellipsis", 4, 5, 6, 7, 8, "ellipsis", 25]);
  });

  it("ne coupe pas au début", () => {
    expect(pageNumbers(1, 25)).toEqual([1, 2, 3, "ellipsis", 25]);
    expect(pageNumbers(2, 25)).toEqual([1, 2, 3, 4, "ellipsis", 25]);
  });

  it("ne coupe pas à la fin", () => {
    expect(pageNumbers(25, 25)).toEqual([1, "ellipsis", 23, 24, 25]);
    expect(pageNumbers(24, 25)).toEqual([1, "ellipsis", 22, 23, 24, 25]);
  });

  it("comble un trou d'une seule page au lieu d'une ellipse", () => {
    // 1 … 3 masquerait la seule page 2 : on l'affiche.
    expect(pageNumbers(5, 25)).toEqual([1, 2, 3, 4, 5, 6, 7, "ellipsis", 25]);
    expect(pageNumbers(21, 25)).toEqual([1, "ellipsis", 19, 20, 21, 22, 23, 24, 25]);
  });

  it("ne renvoie jamais de doublon ni de numéro hors bornes", () => {
    for (let total = 1; total <= 30; total++) {
      for (let current = 1; current <= total; current++) {
        const result = pageNumbers(current, total);
        const numbers = result.filter((entry): entry is number => entry !== "ellipsis");
        expect(new Set(numbers).size).toBe(numbers.length);
        expect(numbers).toEqual([...numbers].sort((a, b) => a - b));
        expect(Math.min(...numbers)).toBeGreaterThanOrEqual(1);
        expect(Math.max(...numbers)).toBeLessThanOrEqual(total);
        expect(numbers).toContain(current);
      }
    }
  });
});

describe("fetchPaginatedLeads", () => {
  /** Faux fetcher : renvoie `per` numéros de page factices et le total demandé. */
  const fakeFetcher = (total: number, per: number) => {
    const calls: number[] = [];
    const fetchPage = async (page: number) => {
      calls.push(page);
      const start = (page - 1) * per;
      const data = Array.from(
        { length: Math.max(0, Math.min(per, total - start)) },
        (_, index) => ({ id: String(start + index) })
      );
      return { data, count: total };
    };
    return { fetchPage, calls };
  };

  it("renvoie la page demandée sans seconde requête", async () => {
    const { fetchPage, calls } = fakeFetcher(120, 50);
    const result = await fetchPaginatedLeads(fetchPage, 2, 50);
    expect(result.page).toBe(2);
    expect(result.total).toBe(120);
    expect(result.leads).toHaveLength(50);
    expect(calls).toEqual([2]);
  });

  it("re-récupère la dernière page réelle si la page demandée n'existe plus", async () => {
    const { fetchPage, calls } = fakeFetcher(120, 50);
    const result = await fetchPaginatedLeads(fetchPage, 9, 50);
    expect(result.page).toBe(3);
    expect(result.leads).toHaveLength(20);
    expect(calls).toEqual([9, 3]);
  });

  it("gère un résultat vide sans seconde requête", async () => {
    const { fetchPage, calls } = fakeFetcher(0, 50);
    const result = await fetchPaginatedLeads(fetchPage, 1, 50);
    expect(result.page).toBe(1);
    expect(result.total).toBe(0);
    expect(result.leads).toEqual([]);
    expect(calls).toEqual([1]);
  });

  it("traite un count nul comme un total de 0", async () => {
    const result = await fetchPaginatedLeads(async () => ({ data: null, count: null }), 1, 50);
    expect(result.total).toBe(0);
    expect(result.leads).toEqual([]);
  });
});
