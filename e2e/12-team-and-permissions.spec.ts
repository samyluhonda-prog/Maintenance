import { expect, test } from "@playwright/test";

import { DEMO_ACCOUNTS, login, loginAsOwner, ORG_SLUG, uniqueSuffix } from "./fixtures";

/**
 * Journey 12: team management (invite a new member and get a real,
 * usable invitation link — no email service is configured for this repo,
 * by design, see docs/ADMIN_GUIDE.md) and permission enforcement in the
 * UI (a Viewer/Auditor account, which has no edit permissions on any
 * module, must not see creation/edit affordances anywhere).
 */
test("invite a team member and generate an invitation link", async ({ page }) => {
  const email = `invite-e2e-${uniqueSuffix()}@example.com`;

  await loginAsOwner(page);
  await page.goto(`/o/${ORG_SLUG}/users`);
  await page.getByRole("button", { name: "Inviter un membre" }).click();
  await page.getByLabel("Courriel").fill(email);
  await page.getByRole("button", { name: "Générer le lien d’invitation" }).click();

  await expect(page.getByText("Partagez ce lien avec la personne invitée")).toBeVisible();
  const inviteUrl = await page.locator('input[readonly]').inputValue();
  expect(inviteUrl).toMatch(/\/invite\//);
});

test("the viewer role sees no creation or edit affordances", async ({ page }) => {
  await login(page, DEMO_ACCOUNTS.viewer);

  await page.goto(`/o/${ORG_SLUG}/equipment`);
  await expect(page.getByRole("link", { name: "Nouvel équipement" })).toHaveCount(0);

  await page.goto(`/o/${ORG_SLUG}/work-orders`);
  const firstWorkOrder = page.locator(`a[href^="/o/${ORG_SLUG}/work-orders/"]`).first();
  await firstWorkOrder.click();
  // StatusBar (status changes, close dialog) is only rendered when canEdit
  // is true — for a Viewer it must render nothing at all.
  await expect(page.getByRole("combobox")).toHaveCount(0);
});
