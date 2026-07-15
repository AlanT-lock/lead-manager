import { describe, expect, it } from "vitest";
import { isPublicAuthPath } from "@/lib/auth-paths";

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
