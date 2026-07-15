import { describe, expect, it } from "vitest";
import {
  DEFAULT_PER_PAGE,
  PER_PAGE_OPTIONS,
  clampPage,
  pageCount,
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
