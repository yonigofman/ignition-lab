import { expect, test } from "@playwright/test";
import {
  answerPredict,
  collectConsoleErrors,
  openLessonModule,
  openTerminal,
  play,
  runCommand,
  setSpeed,
  waitForAutoPause,
} from "./helpers";

test("upi-compact-3node plays to install.complete with zero console errors", async ({ page }) => {
  const errors = collectConsoleErrors(page);

  await page.goto("/");
  await page.waitForSelector("text=UPI compact 3-node cluster");
  // Mount the predict/gate components this scenario's steps reference.
  await openLessonModule(page, "3. The bootstrap dance");
  await setSpeed(page, "10");
  await play(page);

  await waitForAutoPause(page);
  await answerPredict(page, "Masters boot, then fetch their pointer ignition and pull the full config via the MCS");

  await waitForAutoPause(page);
  await answerPredict(page, "The temporary control plane schedules the production control plane onto the masters");

  await waitForAutoPause(page);
  await answerPredict(
    page,
    "The temporary control plane hands over to the production control plane, and bootstrap reports complete"
  );

  // Gate: remove bootstrap from the LB.
  await waitForAutoPause(page);
  await openTerminal(page);
  await runCommand(page, "lab lb rm 6443 bootstrap");
  await runCommand(page, "lab lb rm 22623 bootstrap");

  await waitForAutoPause(page);
  await expect(page.getByText(/t = 150\.0s/)).toBeVisible();

  expect(errors).toEqual([]);
});
