import { describe, expect, it } from "vitest";
import { parseSurfaceBound, parseSurfaceRange } from "./surface-filter";

describe("parseSurfaceBound", () => {
  it("ignore les valeurs vides ou invalides", () => {
    expect(parseSurfaceBound(undefined)).toBeNull();
    expect(parseSurfaceBound(null)).toBeNull();
    expect(parseSurfaceBound("")).toBeNull();
    expect(parseSurfaceBound("  ")).toBeNull();
    expect(parseSurfaceBound("abc")).toBeNull();
    expect(parseSurfaceBound("-5")).toBeNull();
  });

  it("lit les entiers, décimaux et la virgule française", () => {
    expect(parseSurfaceBound("0")).toBe(0);
    expect(parseSurfaceBound("120")).toBe(120);
    expect(parseSurfaceBound("85.5")).toBe(85.5);
    expect(parseSurfaceBound("85,5")).toBe(85.5);
  });
});

describe("parseSurfaceRange", () => {
  it("garde une tranche ouverte d'un côté", () => {
    expect(parseSurfaceRange("80", "")).toEqual({ min: 80, max: null });
    expect(parseSurfaceRange(undefined, "150")).toEqual({ min: null, max: 150 });
  });

  it("remet les bornes dans l'ordre", () => {
    expect(parseSurfaceRange("150", "80")).toEqual({ min: 80, max: 150 });
  });
});
