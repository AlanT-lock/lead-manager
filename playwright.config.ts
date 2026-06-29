import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";
dotenv.config({ path: ".env.test.local" });

const baseURL = process.env.E2E_BASE_URL || "http://localhost:3137";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  retries: 0,
  reporter: [["list"]],
  use: { baseURL, trace: "on-first-retry" },
  projects: [
    { name: "setup", testMatch: /auth\.setup\.ts/ },
    { name: "admin", testMatch: /.*\.admin\.spec\.ts/, dependencies: ["setup"],
      use: { ...devices["Desktop Chrome"], storageState: "e2e/.auth/admin.json" } },
    { name: "telepro", testMatch: /.*\.telepro\.spec\.ts/, dependencies: ["setup"],
      use: { ...devices["Desktop Chrome"], storageState: "e2e/.auth/telepro.json" } },
    { name: "public", testMatch: /.*\.public\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: process.env.E2E_NO_SERVER ? undefined : {
    command: "npm run dev -- -p 3137",
    url: baseURL,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
