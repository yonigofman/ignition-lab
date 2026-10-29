import { describe, expect, it } from "vitest";
import { createInitialSnapshot } from "../../../src/engine/snapshot";
import { ssh } from "../../../src/terminal/commands/ssh";

describe("ssh", () => {
  it("prints a connected banner for core@bootstrap", () => {
    const result = ssh(["core@bootstrap"], createInitialSnapshot());
    expect(result.output).toMatch(/bootstrap/i);
    expect(result.dispatch).toBeUndefined();
  });

  it("prints usage when no target is given", () => {
    const result = ssh([], createInitialSnapshot());
    expect(result.output).toMatch(/usage/i);
  });
});
