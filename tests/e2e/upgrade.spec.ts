import { expect, test } from "@playwright/test";
import { collectConsoleErrors, openTerminal, play, runCommand, selectScenario, setSpeed, waitForAutoPause } from "./helpers";

test("upgrade scenario blocks until a learner starts it, then plays straight through to the new version", async ({
  page,
}) => {
  const errors = collectConsoleErrors(page);

  await page.goto("/");
  await page.waitForSelector("text=UPI compact 3-node cluster");
  await selectScenario(page, "Upgrade (3 master + 2 worker)");

  // Blocked from t=0, with no event to even need a Play click first.
  await expect(page.getByText(/This cluster is healthy on 4\.14\.10/)).toBeVisible();

  await openTerminal(page);
  await runCommand(page, "oc adm upgrade --to=4.15.3");
  await expect(page.getByText(/This cluster is healthy on 4\.14\.10/)).not.toBeVisible();

  await setSpeed(page, "10");
  await play(page);
  await waitForAutoPause(page);

  await expect(page.getByText(/t = 130\.0s/)).toBeVisible();

  await runCommand(page, "oc get clusterversion");
  await expect(page.locator(".xterm")).toContainText("4.15.3");

  expect(errors).toEqual([]);
});
