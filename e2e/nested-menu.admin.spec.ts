import { test, expect } from "@playwright/test";

test("le menu déploie catégories puis statuts et navigue avec les bons params", async ({ page }) => {
  await page.goto("/admin");
  await page.getByTestId("nav-leads-toggle").click();
  const fenetre = page.getByTestId("nav-category-fenetre");
  await expect(fenetre).toBeVisible();
  await fenetre.click();
  await expect(page).toHaveURL(/\/admin\/leads\?.*category=fenetre/);
});
