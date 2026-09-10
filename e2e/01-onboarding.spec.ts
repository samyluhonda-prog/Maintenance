import { expect, test } from "@playwright/test";

import { uniqueSuffix } from "./fixtures";

/**
 * Journey 1: a brand new person signs up, confirms their account, and
 * creates their own organization through the 1-step onboarding form (the
 * full 10-step wizard referenced in the product spec starts here — this
 * test covers the account+org creation entry point; later wizard steps are
 * exercised implicitly by journeys 2-9, which populate locations,
 * equipment, team members, etc. inside the org this test creates).
 *
 * Requires Supabase auto-confirm for new signups in this environment
 * (the default for `supabase start` local dev — see supabase/config.toml).
 * Against a hosted project with confirmation emails required, drive the
 * confirmation link through Inbucket/Mailpit before continuing.
 */
test("sign up, confirm, and create a new organization", async ({ page }) => {
  const suffix = uniqueSuffix();
  const email = `e2e-${suffix}@example.com`;
  const password = "TestPass123!";
  const orgName = `Org Test ${suffix}`;

  await page.goto("/signup");
  await page.getByLabel("Nom complet").fill("Utilisateur E2E");
  await page.getByLabel("Courriel", { exact: true }).fill(email);
  await page.getByLabel("Mot de passe", { exact: true }).fill(password);
  await page.getByLabel("Confirmer le mot de passe").fill(password);
  await page.getByRole("button", { name: "Créer un compte" }).click();

  await expect(page).toHaveURL(/\/login\?confirmEmail=1/);
  await expect(page.getByText(/Compte créé/)).toBeVisible();

  await page.getByLabel("Courriel").fill(email);
  await page.getByLabel("Mot de passe").fill(password);
  await page.getByRole("button", { name: "Se connecter" }).click();

  await expect(page).toHaveURL(/\/onboarding/);
  await page.getByLabel("Nom de l’organisation").fill(orgName);
  await page.getByRole("button", { name: "Créer et continuer" }).click();

  await expect(page).toHaveURL(/\/o\/[^/]+\/dashboard|\/o\/[^/]+\/?$/);
  await expect(page.getByText(orgName)).toBeVisible();
});
