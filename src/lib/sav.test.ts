import { describe, expect, it } from "vitest";
import { isSavStatus, parseSavInput, SAV_PROBLEM_TYPES } from "@/lib/sav";

const valid = {
  name: " Jean Dupont ",
  phone: "06 12 34 56 78",
  email: "",
  address: "1 rue de la Paix, 75002 Paris",
  problem_type: "Fuite",
  description: "Ça fuit",
};

describe("parseSavInput", () => {
  it("accepte un formulaire complet sans email et nettoie les espaces", () => {
    const res = parseSavInput(valid);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data.name).toBe("Jean Dupont");
      expect(res.data.email).toBeNull();
      expect(res.data.lat).toBeNull();
    }
  });

  it("propose les 17 types de problème demandés", () => {
    expect(SAV_PROBLEM_TYPES).toHaveLength(17);
    expect(SAV_PROBLEM_TYPES[0]).toBe("Panne totale");
    expect(SAV_PROBLEM_TYPES[16]).toBe("Autre");
  });

  it.each(["name", "phone", "address", "problem_type", "description"])("refuse si %s est vide", (field) => {
    expect(parseSavInput({ ...valid, [field]: "  " }).ok).toBe(false);
  });

  it("refuse un type de problème hors liste", () => {
    expect(parseSavInput({ ...valid, problem_type: "Inconnu" }).ok).toBe(false);
  });

  it("refuse un email mal formé mais accepte un email correct", () => {
    expect(parseSavInput({ ...valid, email: "pas-un-email" }).ok).toBe(false);
    expect(parseSavInput({ ...valid, email: "a@b.fr" }).ok).toBe(true);
  });

  it("ignore des coordonnées hors bornes", () => {
    const res = parseSavInput({ ...valid, lat: 200, lng: "2.35" });
    expect(res.ok && res.data.lat).toBeNull();
    expect(res.ok && res.data.lng).toBe(2.35);
  });
});

describe("isSavStatus", () => {
  it("reconnaît les statuts valides uniquement", () => {
    expect(isSavStatus("resolu")).toBe(true);
    expect(isSavStatus("a_reprogrammer")).toBe(true);
    expect(isSavStatus("nope")).toBe(false);
    expect(isSavStatus(undefined)).toBe(false);
  });
});
