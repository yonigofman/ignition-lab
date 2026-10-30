import { expect, test } from "@playwright/test";
import { collectConsoleErrors, selectScenario } from "./helpers";

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

test("entering demo mode from a different scenario renders the topology correctly, not blank or stacked", async ({
  page,
}) => {
  const errors = collectConsoleErrors(page);

  await page.goto("/");
  await page.waitForSelector("text=UPI compact 3-node cluster");

  // Regression: switching scenarios then entering demo mode (which forces the
  // default scenario, changing the node/zone set) while playback keeps handing
  // React Flow a new `nodes` array every animation frame raced its own
  // auto-measurement - nodes stayed `visibility: hidden`, or - when visibility
  // won the race - rendered at their parent zone's own position instead of their
  // real offset (all nodes "stacked on each other").
  await selectScenario(page, "UPI (3 master + 2 worker)");
  await page.getByRole("button", { name: "Demo mode", exact: true }).click();
  await page.waitForTimeout(400);

  const boxes = await page.locator(".react-flow__node[data-id]").evaluateAll((nodes) =>
    nodes.map((n) => {
      const r = n.getBoundingClientRect();
      return { id: n.getAttribute("data-id"), x: r.x, y: r.y, visible: getComputedStyle(n).visibility };
    })
  );

  expect(boxes.length).toBeGreaterThan(0);
  for (const box of boxes) {
    expect(box.visible, `${box.id} should be visible`).toBe("visible");
  }

  const positions = boxes.map((b) => `${b.x},${b.y}`);
  expect(new Set(positions).size, "every node should have a distinct position").toBe(positions.length);

  expect(errors).toEqual([]);
});
