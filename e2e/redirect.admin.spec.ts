import { test, expect } from "@playwright/test";

test("admin connecté atterrit dans l'espace admin", async ({ page }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin/);
  await expect(page.getByTestId("nav-leads")).toBeVisible();
});

test("admin peut se déconnecter", async ({ page }) => {
  await page.goto("/admin");
  await page.getByRole("button", { name: "Déconnexion" }).click();
  await expect(page).toHaveURL(/\/login/);
});
