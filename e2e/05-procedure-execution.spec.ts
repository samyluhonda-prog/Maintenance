import { expect, test, type Page } from "@playwright/test";

import { loginAsOwner, ORG_SLUG } from "./fixtures";

/**
 * Journey 5: run the demo org's "Inspection quotidienne — Convoyeurs"
 * procedure template (seeded by db/seed/seed-demo-org.ts) end to end,
 * including flagging a non-conformity on the pass/fail field, and confirm
 * the run completes and produces a record.
 */
function fieldRow(page: Page, label: string) {
  return page.locator("div.rounded-md.border.p-3", { hasText: label });
}

test("execute a procedure/inspection and flag a non-conformity", async ({ page }) => {
  await loginAsOwner(page);
  await page.goto(`/o/${ORG_SLUG}/procedures`);
  await page.getByRole("link", { name: "Inspection quotidienne — Convoyeurs" }).click();
  await page.getByRole("link", { name: "Lancer une inspection" }).click();

  await expect(page).toHaveURL(new RegExp(`/o/${ORG_SLUG}/procedures/[^/]+/run$`));

  await fieldRow(page, "Inspection visuelle de la courroie").getByRole("checkbox").check();
  await fieldRow(page, "Tension de la courroie conforme ?").getByLabel("Oui").check();
  await fieldRow(page, "Bruit anormal détecté ?").getByLabel("Non").check();

  const resultRow = fieldRow(page, "Résultat global");
  await resultRow.getByRole("button", { name: "Non conforme" }).click();
  await resultRow.getByRole("button", { name: "Signaler un problème" }).click();

  await page.getByRole("button", { name: "Terminer" }).click();
  await expect(page.getByText("Échec")).toBeVisible();
  await page.getByRole("link", { name: "Voir le rapport" }).click();
  await expect(page).toHaveURL(new RegExp(`/o/${ORG_SLUG}/procedures/runs/[^/]+$`));
});
