import { expect, test } from "@playwright/test";

import { loginAsOwner, ORG_SLUG, uniqueSuffix } from "./fixtures";

/**
 * Journey 13 (the critical one): a user from one organization must never
 * be able to reach another organization's data, verified from the UI
 * itself rather than direct SQL (see db/tests/rls_isolation_test.sql for
 * the SQL-level equivalent, which exercises the same RLS policies more
 * exhaustively but doesn't prove the Next.js route layer resolves
 * cross-org URLs safely too — this test proves both layers hold).
 *
 * Sets up a second, throwaway organization via real signup+onboarding
 * (not a DB shortcut), creates one equipment record in it so there's a
 * real cross-org ID to probe with, then checks isolation in both
 * directions: the demo org's owner can't open the second org's records
 * by URL, and the second org's owner can't open the demo org's records
 * by URL — both must 404, exactly like any nonexistent record would
 * (requireOrgAccess calls notFound(), never a distinguishable
 * "forbidden" response that would leak the record's existence).
 */
test("a member of one organization cannot access another organization's data", async ({ browser }) => {
  const suffix = uniqueSuffix();
  const otherEmail = `e2e-isolation-${suffix}@example.com`;
  const otherPassword = "TestPass123!";
  const otherOrgSlugPattern = new RegExp(`/o/([^/]+)/dashboard|/o/([^/]+)/?$`);

  const otherContext = await browser.newContext();
  const otherPage = await otherContext.newPage();

  await otherPage.goto("/signup");
  await otherPage.getByLabel("Nom complet").fill("Utilisateur Isolation E2E");
  await otherPage.getByLabel("Courriel", { exact: true }).fill(otherEmail);
  await otherPage.getByLabel("Mot de passe", { exact: true }).fill(otherPassword);
  await otherPage.getByLabel("Confirmer le mot de passe").fill(otherPassword);
  await otherPage.getByRole("button", { name: "Créer un compte" }).click();
  await otherPage.getByLabel("Courriel").fill(otherEmail);
  await otherPage.getByLabel("Mot de passe").fill(otherPassword);
  await otherPage.getByRole("button", { name: "Se connecter" }).click();
  await expect(otherPage).toHaveURL(/\/onboarding/);
  await otherPage.getByLabel("Nom de l’organisation").fill(`Org Isolation ${suffix}`);
  await otherPage.getByRole("button", { name: "Créer et continuer" }).click();
  await expect(otherPage).toHaveURL(otherOrgSlugPattern);
  const otherOrgSlug = new URL(otherPage.url()).pathname.split("/")[2];
  expect(otherOrgSlug).toBeTruthy();
  expect(otherOrgSlug).not.toBe(ORG_SLUG);

  await otherPage.goto(`/o/${otherOrgSlug}/equipment/new`);
  const otherEquipmentName = `Équipement isolé ${suffix}`;
  await otherPage.getByLabel("Nom", { exact: true }).fill(otherEquipmentName);
  await otherPage.getByRole("button", { name: "Enregistrer" }).click();
  await expect(otherPage).toHaveURL(new RegExp(`/o/${otherOrgSlug}/equipment/[^/]+$`));
  const otherEquipmentUrl = otherPage.url();

  // Direction 1: the demo org's owner must not reach the other org's
  // equipment record, its org shell at all, or find it leaking into a
  // cross-org search/list.
  const ownerContext = await browser.newContext();
  const ownerPage = await ownerContext.newPage();
  await loginAsOwner(ownerPage);

  const crossResponse = await ownerPage.goto(otherEquipmentUrl);
  expect(crossResponse?.status()).toBe(404);

  const crossOrgResponse = await ownerPage.goto(`/o/${otherOrgSlug}/dashboard`);
  expect(crossOrgResponse?.status()).toBe(404);

  await ownerPage.goto(`/o/${ORG_SLUG}/equipment`);
  await expect(ownerPage.getByText(otherEquipmentName)).toHaveCount(0);

  // Direction 2: the other org's owner must not reach the demo org's data
  // either.
  const demoEquipmentFromOtherUser = await otherPage.goto(`/o/${ORG_SLUG}/equipment`);
  expect(demoEquipmentFromOtherUser?.status()).toBe(404);
  const demoOrgFromOtherUser = await otherPage.goto(`/o/${ORG_SLUG}/dashboard`);
  expect(demoOrgFromOtherUser?.status()).toBe(404);

  await ownerContext.close();
  await otherContext.close();
});
