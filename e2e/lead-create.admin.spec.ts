import { test, expect } from "@playwright/test";

test("création d'un lead avec catégorie Clim 1 €, puis filtrable", async ({ page }) => {
  const stamp = Date.now().toString().slice(-6);
  const nom = `E2E${stamp}`;

  await page.goto("/admin/leads/new");
  await expect(page.getByTestId("lead-create-form")).toBeVisible();

  const form = page.getByTestId("lead-create-form");

  // Sélecteurs adaptés au formulaire réel :
  // Les <label> n'ont pas de htmlFor et les <input> n'ont pas d'id/name,
  // donc getByLabel() ne fonctionne pas. On utilise des sélecteurs de type.

  // Prénom : premier input[type="text"] dans le formulaire (avant last_name)
  await form.locator('input[type="text"]').nth(0).fill("Test");

  // Nom : deuxième input[type="text"]
  await form.locator('input[type="text"]').nth(1).fill(nom);

  // Téléphone : unique input[type="tel"]
  await form.locator('input[type="tel"]').fill(`06${stamp}0000`.slice(0, 10));

  // Catégorie : data-testid posé par Task 6
  await page.getByTestId("lead-category-select").selectOption("clim_1euro");

  // Télépro assigné : premier <select> du formulaire (champ requis).
  // Index 0 = option vide "— Sélectionner —", index 1 = premier télépro disponible.
  const assign = form.locator("select").nth(0);
  if ((await assign.count()) > 0) {
    await assign.selectOption({ index: 1 });
  }

  await page.getByRole("button", { name: /Créer|Ajouter|Enregistrer/ }).click();

  // Retour liste, filtrer par catégorie + recherche → le lead doit apparaître.
  await page.goto("/admin/leads?category=clim_1euro");
  await page.getByTestId("filter-search").fill(nom);
  await expect(page.getByText(nom)).toBeVisible({ timeout: 8000 });
});
