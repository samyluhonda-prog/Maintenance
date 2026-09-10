import { expect, test } from "@playwright/test";

import { loginAsOwner, ORG_SLUG, uniqueSuffix } from "./fixtures";

/**
 * Journey 4: the full work order lifecycle — create, move through status
 * transitions, log a task/time entry/comment, then close with a required
 * resolution note (the close dialog enforces this server-side too, see
 * closeWorkOrderAction).
 */
test("create a work order, work it, and close it with a resolution", async ({ page }) => {
  const title = `Vibration anormale E2E ${uniqueSuffix()}`;

  await loginAsOwner(page);
  await page.goto(`/o/${ORG_SLUG}/work-orders/new`);
  await page.getByLabel("Titre").fill(title);
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await expect(page).toHaveURL(new RegExp(`/o/${ORG_SLUG}/work-orders/[^/]+$`));
  await expect(page.getByRole("heading", { name: title })).toBeVisible();

  // Status transition: open -> in_progress via the status select.
  await page.getByRole("combobox").first().click();
  await page.getByRole("option", { name: "En cours" }).click();
  await expect(page.getByRole("combobox").first()).toHaveText("En cours");

  // Add a task and check it off.
  await page.getByPlaceholder("Ajouter une tâche…").fill("Vérifier le serrage des boulons");
  await page.getByPlaceholder("Ajouter une tâche…").press("Enter");
  await expect(page.getByText("Vérifier le serrage des boulons")).toBeVisible();
  await page.getByRole("checkbox").first().check();

  // Add a comment.
  await page.getByPlaceholder("Ajouter un commentaire…").fill("Diagnostic en cours, cause probable identifiée.");
  await page.getByRole("button", { name: "Envoyer" }).click();
  await expect(page.getByText("Diagnostic en cours, cause probable identifiée.")).toBeVisible();

  // Close with a resolution.
  await page.getByRole("combobox").first().click();
  await page.getByRole("option", { name: "Fermé" }).click();
  // Dialog has two textareas at this point: "Cause de la panne" then
  // "Solution appliquée *" (no htmlFor association, so index-based).
  await page.getByRole("dialog").getByRole("textbox").nth(1).fill("Boulons resserrés au couple prescrit, vibration disparue.");
  await page.getByRole("button", { name: "Clôturer" }).click();
  await expect(page.getByRole("combobox").first()).toHaveText("Fermé");
});
