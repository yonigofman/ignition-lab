import { expect, test } from "@playwright/test";
import { collectConsoleErrors } from "./helpers";

test("demo mode hides the lesson panel, autoplays with captions, and exits cleanly", async ({ page }) => {
  const errors = collectConsoleErrors(page);

  await page.goto("/");
  await page.waitForSelector("text=UPI compact 3-node cluster");
  await expect(page.getByRole("button", { name: "0. Concepts" })).toBeVisible();

  await page.getByRole("button", { name: "Demo mode", exact: true }).click();

  // Lesson panel is gone.
  await expect(page.getByRole("button", { name: "0. Concepts" })).not.toBeVisible();

  // Playback started on its own - no Play click.
  await expect(page.getByRole("button", { name: "Pause" })).toBeVisible();

  // A plain-language caption is showing.
  await expect(page.getByText("A temporary bootstrap machine boots up and starts the install.")).toBeVisible();

  await page.getByRole("button", { name: "Exit demo", exact: true }).click();

  // Back to the normal UI.
  await expect(page.getByRole("button", { name: "0. Concepts" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Demo mode", exact: true })).toBeVisible();

  expect(errors).toEqual([]);
});

test("demo mode on a narrow viewport drops the Inspector panel", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.waitForSelector("text=UPI compact 3-node cluster");
  await expect(page.getByText("Select a node to see details.")).toBeVisible();

  await page.getByRole("button", { name: "Demo mode", exact: true }).click();
  await expect(page.getByText("Select a node to see details.")).not.toBeVisible();
});
