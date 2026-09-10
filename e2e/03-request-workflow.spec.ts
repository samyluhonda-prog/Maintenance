import { expect, test } from "@playwright/test";

import { DEMO_ACCOUNTS, login, ORG_SLUG, uniqueSuffix } from "./fixtures";

/**
 * Journey 3: the full maintenance request workflow — a requester (no
 * elevated permissions) submits a request, an owner/manager reviews and
 * approves it, then converts it into a real work order. Uses two separate
 * browser contexts to simulate the two distinct users involved, the way
 * they'd actually interact with the app from different devices.
 */
test("submit a request, approve it, and convert it to a work order", async ({ browser }) => {
  const title = `Fuite d'air comprimé E2E ${uniqueSuffix()}`;

  const requesterContext = await browser.newContext();
  const requesterPage = await requesterContext.newPage();
  await login(requesterPage, DEMO_ACCOUNTS.requester);

  await requesterPage.goto(`/o/${ORG_SLUG}/requests/new`);
  await requesterPage.getByLabel("Titre").fill(title);
  await requesterPage.getByRole("button", { name: "Soumettre la demande" }).click();
  await expect(requesterPage).toHaveURL(new RegExp(`/o/${ORG_SLUG}/requests/[^/]+$`));
  await expect(requesterPage.getByText(title)).toBeVisible();
  const requestUrl = requesterPage.url();
  await requesterContext.close();

  const ownerContext = await browser.newContext();
  const ownerPage = await ownerContext.newPage();
  await login(ownerPage, DEMO_ACCOUNTS.owner);

  await ownerPage.goto(requestUrl);
  await expect(ownerPage.getByText(title)).toBeVisible();
  await ownerPage.getByRole("button", { name: "Approuver" }).click();
  await expect(ownerPage.getByRole("button", { name: "Convertir en bon de travail" })).toBeVisible();

  await ownerPage.getByRole("button", { name: "Convertir en bon de travail" }).click();
  await expect(ownerPage).toHaveURL(new RegExp(`/o/${ORG_SLUG}/work-orders/[^/]+$`));
  await expect(ownerPage.getByText(title)).toBeVisible();

  await ownerContext.close();
});
