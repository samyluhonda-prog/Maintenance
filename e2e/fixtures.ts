import { expect, type Page } from "@playwright/test";

/**
 * Accounts and org created by `db/seed/seed-demo-org.ts` (npm run db:seed:demo).
 * Password is identical for every demo account — see DEMO_PASSWORD there.
 */
export const ORG_SLUG = "recyclage-nordique";
export const DEMO_PASSWORD = "Demo1234!";

export const DEMO_ACCOUNTS = {
  owner: "owner@recyclage-nordique.demo",
  admin: "admin@recyclage-nordique.demo",
  maintenanceManager: "gestionnaire@recyclage-nordique.demo",
  planner: "planificateur@recyclage-nordique.demo",
  supervisor: "superviseur@recyclage-nordique.demo",
  technician: "technicien1@recyclage-nordique.demo",
  technician2: "technicien2@recyclage-nordique.demo",
  requester: "employe@recyclage-nordique.demo",
  vendor: "fournisseur@recyclage-nordique.demo",
  viewer: "auditeur@recyclage-nordique.demo",
} as const;

/** Logs the given demo account in through the real login form (no API shortcuts). */
export async function login(page: Page, email: string, password: string = DEMO_PASSWORD) {
  await page.goto("/login");
  await page.getByLabel("Courriel").fill(email);
  await page.getByLabel("Mot de passe").fill(password);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page).not.toHaveURL(/\/login/);
}

export async function loginAsOwner(page: Page) {
  await login(page, DEMO_ACCOUNTS.owner);
}

/** A fresh, never-used-before email/org slug for tests that create their own tenant. */
export function uniqueSuffix() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
