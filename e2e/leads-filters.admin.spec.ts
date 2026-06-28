import { test, expect } from "@playwright/test";
import { hasAuthEnv } from "./helpers";

test.skip(!hasAuthEnv, "identifiants E2E absents (.env.test.local)");

test("filtre catégorie met à jour l'URL", async ({ page }) => {
  await page.goto("/admin/leads");
  await page.getByTestId("filter-category").selectOption("fenetre");
  await expect(page).toHaveURL(/category=fenetre/);
});

test("filtre statut met à jour l'URL", async ({ page }) => {
  await page.goto("/admin/leads");
  await page.getByTestId("filter-status").selectOption("nouveau");
  await expect(page).toHaveURL(/status=nouveau/);
});

test("recherche met à jour l'URL (param q)", async ({ page }) => {
  await page.goto("/admin/leads");
  await page.getByTestId("filter-search").fill("Dupont");
  await expect(page).toHaveURL(/q=Dupont/, { timeout: 5000 });
});
