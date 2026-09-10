import { expect, test } from "@playwright/test";

import { loginAsOwner, ORG_SLUG, uniqueSuffix } from "./fixtures";

/**
 * Journey 6: create a preventive maintenance plan with a calendar trigger,
 * then run the manual "Vérifier maintenant" automation check.
 *
 * Note on scope: `upsertPmTriggerAction` deliberately seeds a fresh
 * calendar trigger's `next_due_at` one full interval out from creation
 * (see src/lib/actions/pm-plans.ts) so a brand-new trigger is never
 * immediately due — this prevents a plan from generating a flood of
 * backlogged work orders the moment it's saved. That means this test can
 * genuinely exercise the plan/trigger creation UI and the manual
 * evaluation endpoint, but cannot itself produce a *newly generated* work
 * order without either waiting a full interval or backdating the row
 * directly in the database (out of scope for a browser-driven e2e test).
 * Actual PM generation is covered by app.generate_pm_work_order() being
 * exercised against the seeded demo plans once a real environment is
 * running — see docs/TESTING.md.
 */
test("create a PM plan with a calendar trigger and run the automation check", async ({ page }) => {
  const planName = `PM Test E2E ${uniqueSuffix()}`;

  await loginAsOwner(page);
  await page.goto(`/o/${ORG_SLUG}/pm-plans/new`);

  await page.getByLabel("Nom du plan").fill(planName);
  await page.getByRole("combobox", { name: /Équipement/i }).click();
  await page.getByRole("option").first().click();
  await page.getByLabel("Titre du bon de travail").fill(`Entretien préventif — ${planName}`);
  await page.getByRole("button", { name: "Enregistrer" }).click();

  await expect(page).toHaveURL(new RegExp(`/o/${ORG_SLUG}/pm-plans/[^/]+$`));
  await expect(page.getByRole("heading", { name: planName })).toBeVisible();

  await page.getByRole("button", { name: "Ajouter un déclencheur" }).click();
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await expect(page.getByText("Calendrier")).toBeVisible();

  await page.getByRole("button", { name: "Vérifier maintenant" }).click();
  await expect(page.getByText(/déclencheur\(s\) évalué/)).toBeVisible();
});
