import { describe, expect, it } from "vitest";
import { createInitialSnapshot } from "../../src/engine/snapshot";
import { runLine } from "../../src/terminal/registry";

const snapshot = createInitialSnapshot();

describe("runLine", () => {
  it("dispatches to the registered command for the first token", () => {
    const result = runLine("dig api-int.demo.lab.example.com", snapshot);
    expect(result.output).toMatch(/NXDOMAIN/);
  });

  it("returns empty output for a blank line", () => {
    expect(runLine("   ", snapshot).output).toBe("");
  });

  it("suggests the closest command for a near-miss typo", () => {
    const result = runLine("dg api-int.demo.lab.example.com", snapshot);
    expect(result.output).toMatch(/command not found/i);
    expect(result.output).toMatch(/dig/);
  });

  it("reports no suggestion when nothing is close", () => {
    const result = runLine("zzzzzzzzzz", snapshot);
    expect(result.output).toMatch(/command not found/i);
  });

  it("shows usage (not an error) for a bare command with a sub-command router", () => {
    const result = runLine("oc", snapshot);
    expect(result.output).toContain("oc get nodes");
    expect(result.output).not.toMatch(/command not found/i);
  });

  it("shows usage for <command> --help", () => {
    const result = runLine("oc --help", snapshot);
    expect(result.output).toContain("oc get nodes");
  });

  it("shows usage for <command> -h", () => {
    const result = runLine("dig -h", snapshot);
    expect(result.output).toMatch(/dig <name>/);
  });

  it("shows usage for <command> help", () => {
    const result = runLine("oc help", snapshot);
    expect(result.output).toContain("oc get nodes");
  });
});

describe("help", () => {
  it("lists every registered command with a description", () => {
    const result = runLine("help", snapshot);
    for (const name of ["oc", "dig", "curl", "openshift-install", "ssh", "journalctl", "lab", "help", "clear"]) {
      expect(result.output).toContain(name);
    }
  });
});
