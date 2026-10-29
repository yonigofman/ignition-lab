import { describe, expect, it } from "vitest";
import { closestMatch } from "../../src/terminal/closestMatch";

describe("closestMatch", () => {
  it("finds a one-typo match", () => {
    expect(closestMatch("dg", ["oc", "dig", "curl", "help"])).toBe("dig");
  });

  it("returns null when nothing is close enough", () => {
    expect(closestMatch("zzzzzzzzzz", ["oc", "dig", "curl", "help"])).toBeNull();
  });

  it("returns null for an empty candidate list", () => {
    expect(closestMatch("dig", [])).toBeNull();
  });

  it("picks the closer of two candidates", () => {
    expect(closestMatch("oc", ["oc", "dig"])).toBe("oc");
  });
});
