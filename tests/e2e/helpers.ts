import type { Page } from "@playwright/test";

export async function selectScenario(page: Page, label: string) {
  await page.locator("select").first().selectOption({ label });
}

export async function setSpeed(page: Page, value: string) {
  await page.locator("select").nth(1).selectOption(value);
}

export async function play(page: Page) {
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await page.getByRole("button", { name: "Pause" }).waitFor({ state: "visible" });
}

/** Waits for playback to be running (confirming it actually (re)started, not just
 * mid-transition) and then for it to stop again - avoids racing a caller that polls
 * immediately after a click/dispatch, before React has re-rendered the Pause button. */
export async function waitForAutoPause(page: Page, timeoutMs = 20000) {
  await page.getByRole("button", { name: "Pause" }).waitFor({ state: "visible", timeout: timeoutMs });

  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const pauseVisible = await page
      .getByRole("button", { name: "Pause" })
      .isVisible()
      .catch(() => false);
    if (!pauseVisible) return;
    await page.waitForTimeout(200);
  }
  throw new Error("never auto-paused within timeout");
}

export async function openLessonModule(page: Page, name: string) {
  await page.getByRole("button", { name, exact: true }).click();
}

export async function answerPredict(page: Page, optionText: string) {
  await page.getByRole("button", { name: optionText, exact: true }).click();
}

export async function openTerminal(page: Page) {
  await page.getByRole("button", { name: "Terminal", exact: true }).click();
  await page.waitForSelector(".xterm");
}

export async function runCommand(page: Page, cmd: string) {
  await page.locator(".xterm").click();
  await page.keyboard.type(cmd);
  await page.keyboard.press("Enter");
  await page.waitForTimeout(150);
}

export function collectConsoleErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  page.on("pageerror", (err) => errors.push(String(err)));
  return errors;
}
