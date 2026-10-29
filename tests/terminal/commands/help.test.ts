import { describe, expect, it } from "vitest";
import { createInitialSnapshot } from "../../../src/engine/snapshot";
import { help } from "../../../src/terminal/commands/help";
import { registry } from "../../../src/terminal/registry";

const snapshot = createInitialSnapshot();

describe("help with no args", () => {
  it("lists every registered command with its one-line description", () => {
    const result = help([], snapshot);
    for (const [name, command] of Object.entries(registry)) {
      expect(result.output).toContain(name);
      expect(result.output).toContain(command.description);
    }
  });
});

describe("help <command>", () => {
  it("prints the detailed usage for a known command", () => {
    const result = help(["oc"], snapshot);
    expect(result.output).toBe(registry.oc?.usage);
    expect(result.output).toContain("oc get nodes");
    expect(result.output).toContain("oc adm certificate approve");
  });

  it("every registered command has non-empty usage text", () => {
    for (const name of Object.keys(registry)) {
      const result = help([name], snapshot);
      expect(result.output.length, `usage for "${name}" should not be empty`).toBeGreaterThan(0);
    }
  });

  it("suggests the closest match for an unknown command", () => {
    const result = help(["dg"], snapshot);
    expect(result.output).toMatch(/no help for "dg"/);
    expect(result.output).toMatch(/dig/);
  });

  it("reports no help with no suggestion when nothing is close", () => {
    const result = help(["zzzzzzzzzz"], snapshot);
    expect(result.output).toMatch(/no help for "zzzzzzzzzz"/);
  });
});
