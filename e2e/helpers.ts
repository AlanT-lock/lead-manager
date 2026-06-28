import { test as base } from "@playwright/test";

export const hasAuthEnv =
  !!process.env.E2E_ADMIN_EMAIL && !!process.env.E2E_ADMIN_PASSWORD;

export const test = base;
export { expect } from "@playwright/test";
