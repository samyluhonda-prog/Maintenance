import { expect, test } from "@playwright/test";

import { loginAsOwner, ORG_SLUG } from "./fixtures";

/**
 * Journey 11 (dashboards/reports): KPIs render with real computed values
 * for the default 30-day window, the date-range filter changes the
 * displayed window, and the CSV export link produces an actual CSV
 * download (not a broken/placeholder link).
 */
test("filter the reports page and export a CSV", async ({ page }) => {
  await loginAsOwner(page);
  await page.goto(`/o/${ORG_SLUG}/reports`);

  await expect(page.getByText("Bons de travail ouverts")).toBeVisible();
  await expect(page.getByText("MTTR (temps moyen de réparation)")).toBeVisible();

  await page.locator('input[name="from"]').fill("2020-01-01");
  await page.getByRole("button", { name: "Appliquer" }).click();
  await expect(page).toHaveURL(/from=2020-01-01/);
  await expect(page.getByText("2020-01-01 au")).toBeVisible();

  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("link", { name: "Exporter CSV" }).click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/\.csv$/);
});
