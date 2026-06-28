import { test, expect } from "@playwright/test";

test("la page de login s'affiche", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByTestId("login-form")).toBeVisible();
  await expect(page.getByRole("button", { name: "Se connecter" })).toBeVisible();
});

test("mauvais identifiants → message d'erreur, reste sur /login", async ({ page }) => {
  await page.goto("/login");
  await page.locator("#email").fill("inexistant@example.com");
  await page.locator("#password").fill("mauvaismotdepasse");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page).toHaveURL(/\/login/);
});
