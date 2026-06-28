import { test, expect } from "@playwright/test";
import { hasAuthEnv } from "./helpers";

test.skip(!hasAuthEnv, "identifiants E2E absents (.env.test.local)");

test("le menu déploie catégories puis statuts et navigue avec les bons params", async ({ page }) => {
  await page.goto("/admin");
  await page.getByTestId("nav-leads-toggle").click();
  const fenetre = page.getByTestId("nav-category-fenetre");
  await expect(fenetre).toBeVisible();
  await fenetre.click();
  await expect(page).toHaveURL(/\/admin\/leads\?.*category=fenetre/);
});
