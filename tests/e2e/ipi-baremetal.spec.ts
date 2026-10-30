import { expect, test } from "@playwright/test";
import { collectConsoleErrors, play, selectScenario, setSpeed, waitForAutoPause } from "./helpers";

test("ipi-baremetal plays straight through to install.complete - no gates, no terminal needed", async ({ page }) => {
  const errors = collectConsoleErrors(page);

  await page.goto("/");
  await page.waitForSelector("text=UPI compact 3-node cluster");
  await selectScenario(page, "IPI bare metal (3 master + 2 worker)");
  await setSpeed(page, "10");
  await play(page);

  await waitForAutoPause(page);
  await expect(page.getByText(/t = 180\.0s/)).toBeVisible();

  expect(errors).toEqual([]);
});
