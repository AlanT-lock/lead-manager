import { test as setup, expect } from "@playwright/test";
import fs from "node:fs";

const roles = [
  { file: "e2e/.auth/admin.json", email: process.env.E2E_ADMIN_EMAIL, pwd: process.env.E2E_ADMIN_PASSWORD, expect: /\/admin/ },
  { file: "e2e/.auth/telepro.json", email: process.env.E2E_TELEPRO_EMAIL, pwd: process.env.E2E_TELEPRO_PASSWORD, expect: /\/telepro/ },
];

for (const r of roles) {
  setup(`auth ${r.file}`, async ({ page }) => {
    setup.skip(!r.email || !r.pwd, "identifiants E2E absents (.env.test.local)");
    fs.mkdirSync("e2e/.auth", { recursive: true });
    await page.goto("/login");
    await page.locator("#email").fill(r.email!);
    await page.locator("#password").fill(r.pwd!);
    await page.getByRole("button", { name: "Se connecter" }).click();
    await page.waitForURL(r.expect, { timeout: 15_000 });
    await page.context().storageState({ path: r.file });
  });
}
