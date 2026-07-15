import { test, expect } from "@playwright/test";
import { hasAuthEnv } from "./helpers";

test.skip(!hasAuthEnv, "identifiants E2E absents (.env.test.local)");

test("le sélecteur de taille met à jour l'URL", async ({ page }) => {
  await page.goto("/admin/leads?per=25");
  await page.getByTestId("pagination-per").selectOption("100");
  await expect(page).toHaveURL(/per=100/);
});

test("changer de taille ramène en page 1", async ({ page }) => {
  await page.goto("/admin/leads?per=25&page=2");
  await page.getByTestId("pagination-per").selectOption("100");
  await expect(page).toHaveURL(/per=100/);
  await expect(page).not.toHaveURL(/page=/);
});

test("changer un filtre préserve la taille et ramène en page 1", async ({ page }) => {
  await page.goto("/admin/leads?per=100&page=3");
  await page.getByTestId("filter-category").selectOption("fenetre");
  await expect(page).toHaveURL(/category=fenetre/);
  await expect(page).toHaveURL(/per=100/);
  await expect(page).not.toHaveURL(/page=/);
});

test("la barre de pagination est absente quand il n'y a qu'une page", async ({ page }) => {
  // Un filtre très restrictif : au plus quelques leads, donc une seule page de 200.
  await page.goto("/admin/leads?per=200&q=zzzzzzzzzzzz");
  // Prouve d'abord qu'on est bien arrivé sur la page de leads. Sans cette ligne, le test
  // passerait aussi si la session expirait (redirection vers /login) ou si la page plantait :
  // la barre serait absente pour une tout autre raison que « une seule page ».
  await expect(page.getByTestId("filter-search")).toBeVisible();
  await expect(page.getByTestId("pagination")).toHaveCount(0);
});
