import { expect, test } from "@playwright/test";
import {
  answerPredict,
  collectConsoleErrors,
  openLessonModule,
  openTerminal,
  play,
  runCommand,
  selectScenario,
  setSpeed,
  waitForAutoPause,
} from "./helpers";

test("upi-3m-2w plays to install.complete with zero console errors", async ({ page }) => {
  const errors = collectConsoleErrors(page);

  await page.goto("/");
  await page.waitForSelector("text=UPI compact 3-node cluster");
  await selectScenario(page, "UPI (3 master + 2 worker)");
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

  // Gate 1: remove bootstrap from the LB.
  await waitForAutoPause(page);
  await openTerminal(page);
  await runCommand(page, "lab lb rm 6443 bootstrap");
  await runCommand(page, "lab lb rm 22623 bootstrap");

  // Gate 2: approve both workers' client CSRs.
  await waitForAutoPause(page);
  await runCommand(page, "oc adm certificate approve csr-worker-0-client");
  await runCommand(page, "oc adm certificate approve csr-worker-1-client");

  // Gate 3: approve both workers' serving CSRs.
  await waitForAutoPause(page);
  await runCommand(page, "oc adm certificate approve csr-worker-0-serving");
  await runCommand(page, "oc adm certificate approve csr-worker-1-serving");

  await waitForAutoPause(page);
  await expect(page.getByText(/t = 180\.0s/)).toBeVisible();

  expect(errors).toEqual([]);
});
