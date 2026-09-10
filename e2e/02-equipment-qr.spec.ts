import { expect, test } from "@playwright/test";

import { loginAsOwner, ORG_SLUG, uniqueSuffix } from "./fixtures";

/**
 * Journey 2: create an equipment record, confirm its auto-generated QR
 * code renders, then verify scan-to-open by navigating straight to the
 * public /scan/[code] resolver — the same URL a phone camera would open
 * after scanning the printed label.
 */
test("create equipment, view its QR code, and scan-to-open it", async ({ page }) => {
  const name = `Convoyeur E2E ${uniqueSuffix()}`;

  await loginAsOwner(page);
  await page.goto(`/o/${ORG_SLUG}/equipment/new`);
  await page.getByLabel("Nom", { exact: true }).fill(name);
  await page.getByRole("button", { name: "Enregistrer" }).click();

  await expect(page).toHaveURL(new RegExp(`/o/${ORG_SLUG}/equipment/[^/]+$`));
  await expect(page.getByRole("heading", { name })).toBeVisible();

  await page.locator("#qr").scrollIntoViewIfNeeded();
  const code = await page.locator("#qr p.font-mono").textContent();
  expect(code).toBeTruthy();

  await page.goto(`/scan/${code}`);
  await expect(page).toHaveURL(new RegExp(`/o/${ORG_SLUG}/equipment/[^/]+$`));
  await expect(page.getByRole("heading", { name })).toBeVisible();
});
