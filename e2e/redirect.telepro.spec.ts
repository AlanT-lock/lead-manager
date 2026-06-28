import { test, expect } from "@playwright/test";

test("télépro connecté atterrit dans l'espace télépro", async ({ page }) => {
  await page.goto("/telepro");
  await expect(page).toHaveURL(/\/telepro/);
  await expect(page.getByTestId("nav-leads")).toBeVisible();
});

test("télépro n'accède pas à l'espace admin (redirigé)", async ({ page }) => {
  await page.goto("/admin/users");
  await expect(page).toHaveURL(/\/telepro/);
});
