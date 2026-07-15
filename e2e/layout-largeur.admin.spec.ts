import { test, expect } from "@playwright/test";
import { hasAuthEnv } from "./helpers";

test.skip(!hasAuthEnv, "identifiants E2E absents (.env.test.local)");

// 1280x800 : un écran 13 pouces, la taille où la gêne a été signalée.
test.use({ viewport: { width: 1280, height: 800 } });

test("/admin/leads ne scrolle pas horizontalement en 13 pouces", async ({ page }) => {
  await page.goto("/admin/leads");

  // Prouve d'abord que la page a chargé : sans ça, un échec de rendu
  // donnerait une page vide qui ne déborde pas, et le test passerait pour
  // la mauvaise raison.
  await expect(page.getByTestId("filter-search")).toBeVisible();

  const overflow = await page.evaluate(() => {
    const el = document.documentElement;
    return { scrollWidth: el.scrollWidth, clientWidth: el.clientWidth };
  });

  expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth);
});

test("le tableau garde son propre scroll horizontal", async ({ page }) => {
  await page.goto("/admin/leads");
  await expect(page.getByTestId("filter-search")).toBeVisible();

  // Le débordement doit vivre dans le conteneur du tableau, pas dans la page.
  const container = page.locator('[data-slot="table-container"]').first();
  await expect(container).toBeVisible();

  const scrollable = await container.evaluate(
    (el) => el.scrollWidth > el.clientWidth
  );
  expect(scrollable).toBe(true);
});
