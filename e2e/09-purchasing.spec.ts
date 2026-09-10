import { expect, test } from "@playwright/test";

import { loginAsOwner, ORG_SLUG, uniqueSuffix } from "./fixtures";

/**
 * Journey 9 (purchasing): create a purchase order, drive it through its
 * full approval workflow (draft -> requested -> pending_approval ->
 * approved -> ordered), then partially receive a line and confirm the
 * received quantity is tracked without marking the line fully received.
 */
test("create a purchase order, approve it, and partially receive a line", async ({ page }) => {
  const description = `Pièces diverses E2E ${uniqueSuffix()}`;

  await loginAsOwner(page);
  await page.goto(`/o/${ORG_SLUG}/purchasing/new`);

  await page.getByRole("combobox", { name: /Fournisseur/i }).click();
  await page.getByRole("option").first().click();

  // Single default line at this point — target it by position, since the
  // description cell is an uncommitted <Input> and can't yet be matched by
  // its future text content the way the (read-only) detail page can.
  const firstLine = page.locator("tbody tr").first();
  await firstLine.getByPlaceholder("Description").fill(description);
  await firstLine.locator('input[type="number"]').nth(0).fill("10");
  await firstLine.locator('input[type="number"]').nth(1).fill("25");

  await page.getByRole("button", { name: "Créer le bon de commande" }).click();
  await expect(page).toHaveURL(new RegExp(`/o/${ORG_SLUG}/purchasing/[^/]+$`));
  await expect(page.getByText("Brouillon")).toBeVisible();

  for (const label of ["Soumettre", "Envoyer pour approbation", "Approuver", "Commander"]) {
    await page.getByRole("button", { name: label }).click();
  }
  await expect(page.getByText("Commandée")).toBeVisible();

  await page.getByRole("button", { name: "Recevoir" }).click();
  const qtyInput = page.getByRole("dialog").locator('input[type="number"]');
  await qtyInput.fill("6");
  await page.getByRole("button", { name: "Confirmer la réception" }).click();

  await expect(page.getByText("Partiellement reçue")).toBeVisible();
  await expect(page.getByRole("row", { name: description }).getByRole("cell").nth(3)).toHaveText("6");
});
