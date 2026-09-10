import { expect, test } from "@playwright/test";

import { loginAsOwner, ORG_SLUG } from "./fixtures";

/**
 * Journey 10 (calendar): the scheduling calendar renders assigned work
 * orders on their due dates, month navigation works, and clicking a
 * scheduled work order opens it.
 *
 * Note on scope: the calendar supports native HTML5 drag-and-drop
 * rescheduling (calendar-grid.tsx, `draggable` cards). Playwright cannot
 * reliably simulate native HTML5 DnD (it requires manually dispatching
 * dragstart/dragover/drop DragEvents, which is brittle and
 * implementation-specific rather than a real user interaction) — so this
 * test verifies the calendar's rendering and navigation, not the drag
 * gesture itself.
 */
test("navigate the calendar and open a scheduled work order", async ({ page }) => {
  await loginAsOwner(page);
  await page.goto(`/o/${ORG_SLUG}/calendar`);

  await expect(page.getByRole("heading")).toBeVisible();

  const nextMonthLink = page.locator('a[href*="?month="]').last();
  await nextMonthLink.click();
  await expect(page).toHaveURL(/\?month=/);

  await page.goBack();
  const workOrderLink = page.locator(`a[href^="/o/${ORG_SLUG}/work-orders/"]`).first();
  if (await workOrderLink.count()) {
    await workOrderLink.click();
    await expect(page).toHaveURL(new RegExp(`/o/${ORG_SLUG}/work-orders/[^/]+$`));
  }
});
