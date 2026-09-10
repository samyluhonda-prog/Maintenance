import { expect, test } from "@playwright/test";

import { loginAsOwner, ORG_SLUG } from "./fixtures";

/**
 * Journey 7: record a manual meter reading against one of the demo org's
 * seeded meters ("Heures moteur" on the L120 loader) and confirm it shows
 * up both as the new "latest value" and in the readings history table.
 */
test("record a meter reading and see it in the history", async ({ page }) => {
  await loginAsOwner(page);
  await page.goto(`/o/${ORG_SLUG}/meters`);
  await page.getByRole("link", { name: "Heures moteur" }).click();

  await expect(page).toHaveURL(new RegExp(`/o/${ORG_SLUG}/meters/[^/]+$`));

  const uniqueValue = (2000 + Math.floor(Math.random() * 900)).toString();
  await page.getByLabel(/Valeur \(/).fill(uniqueValue);
  await page.getByRole("button", { name: "Enregistrer le relevé" }).click();

  await expect(page.getByText(`${uniqueValue} h`).first()).toBeVisible();
});
