import { describe, expect, it } from "vitest";
import { isPublicAuthPath, isPublicSavPath } from "@/lib/auth-paths";

describe("isPublicAuthPath", () => {
  it("laisse passer les pages d'auth sans session", () => {
    expect(isPublicAuthPath("/login")).toBe(true);
    expect(isPublicAuthPath("/forgot-password")).toBe(true);
    expect(isPublicAuthPath("/reset-password")).toBe(true);
  });

  it("laisse passer /auth/confirm : le lien email arrive sans session, c'est la route qui la crée", () => {
    expect(isPublicAuthPath("/auth/confirm")).toBe(true);
    expect(isPublicAuthPath("/auth/confirm?token_hash=abc&type=recovery")).toBe(true);
  });

  it("protège les pages applicatives", () => {
    expect(isPublicAuthPath("/")).toBe(false);
    expect(isPublicAuthPath("/admin")).toBe(false);
    expect(isPublicAuthPath("/telepro")).toBe(false);
    expect(isPublicAuthPath("/admin/leads")).toBe(false);
  });
});

describe("isPublicSavPath", () => {
  it("ouvre le formulaire client et ses routes d'API", () => {
    expect(isPublicSavPath("/demande-sav")).toBe(true);
    expect(isPublicSavPath("/api/sav/public")).toBe(true);
    expect(isPublicSavPath("/api/sav/places/autocomplete")).toBe(true);
  });

  it("garde la page de gestion et son API protégées", () => {
    expect(isPublicSavPath("/admin/sav")).toBe(false);
    expect(isPublicSavPath("/api/admin/sav")).toBe(false);
    expect(isPublicSavPath("/api/admin/sav/123/photos")).toBe(false);
    expect(isPublicSavPath("/demande-savoir")).toBe(false);
  });
});
