import { describe, expect, it } from "vitest";
import { createInitialSnapshot } from "../../../src/engine/snapshot";
import { clear } from "../../../src/terminal/commands/clear";

describe("clear", () => {
  it("asks the terminal to clear its screen and prints nothing", () => {
    const result = clear([], createInitialSnapshot());
    expect(result.clearScreen).toBe(true);
    expect(result.output).toBe("");
    expect(result.dispatch).toBeUndefined();
  });
});
