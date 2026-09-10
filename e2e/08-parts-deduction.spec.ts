import { expect, test } from "@playwright/test";

import { loginAsOwner, ORG_SLUG, uniqueSuffix } from "./fixtures";

const PART_NAME = "Filtre à air chargeuse L120";

/**
 * Journey 9 (parts/inventory): using a part on a work order automatically
 * deducts it from stock — verified end to end through the UI by reading
 * the part's "quantité en main" before and after, not just by checking
 * that the work order's used-parts list shows an entry.
 */
test("using a part on a work order deducts it from inventory automatically", async ({ page }) => {
  await loginAsOwner(page);

  await page.goto(`/o/${ORG_SLUG}/parts`);
  const partRow = page.getByRole("row", { name: new RegExp(PART_NAME) });
  const before = Number((await partRow.getByRole("cell").nth(4).innerText()).trim().split(" ")[0]);

  await page.goto(`/o/${ORG_SLUG}/work-orders/new`);
  await page.getByLabel("Titre").fill(`Utilisation de pièce E2E ${uniqueSuffix()}`);
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await expect(page).toHaveURL(new RegExp(`/o/${ORG_SLUG}/work-orders/[^/]+$`));

  await page.getByRole("tab", { name: "Pièces" }).click();
  const partsPanel = page.getByRole("tabpanel");
  await partsPanel.getByRole("combobox").click();
  await page.getByRole("option", { name: new RegExp(PART_NAME) }).click();
  await partsPanel.getByRole("spinbutton").fill("1");
  await partsPanel.getByRole("button").last().click();

  await expect(partsPanel.getByText(PART_NAME)).toBeVisible();

  await page.goto(`/o/${ORG_SLUG}/parts`);
  const afterText = await partRow.getByRole("cell").nth(4).innerText();
  expect(Number(afterText.trim().split(" ")[0])).toBe(before - 1);
});
