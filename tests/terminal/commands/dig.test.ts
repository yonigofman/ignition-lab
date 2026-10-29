import { describe, expect, it } from "vitest";
import { createInitialSnapshot } from "../../../src/engine/snapshot";
import { dig } from "../../../src/terminal/commands/dig";

const snapshot = createInitialSnapshot({
  dns: {
    "api-int.demo.lab.example.com": "192.168.1.10",
    "*.apps.demo.lab.example.com": "192.168.1.10",
  },
});

describe("dig", () => {
  it("prints an ANSWER SECTION with the A record when it resolves", () => {
    const result = dig(["api-int.demo.lab.example.com"], snapshot);
    expect(result.output).toContain("ANSWER SECTION");
    expect(result.output).toContain("api-int.demo.lab.example.com");
    expect(result.output).toContain("192.168.1.10");
    expect(result.dispatch).toBeUndefined();
  });

  it("prints NXDOMAIN when the name does not resolve", () => {
    const result = dig(["missing.demo.lab.example.com"], snapshot);
    expect(result.output).toContain("NXDOMAIN");
    expect(result.output).not.toContain("ANSWER SECTION");
  });

  it("resolves names against the *.apps wildcard record", () => {
    const result = dig(["console-openshift-console.apps.demo.lab.example.com"], snapshot);
    expect(result.output).toContain("ANSWER SECTION");
    expect(result.output).toContain("192.168.1.10");
  });

  it("prints usage when no name is given", () => {
    const result = dig([], snapshot);
    expect(result.output).toMatch(/usage/i);
  });
});
