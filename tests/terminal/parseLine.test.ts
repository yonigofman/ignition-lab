import { describe, expect, it } from "vitest";
import { parseLine } from "../../src/terminal/parseLine";

describe("parseLine", () => {
  it("splits on whitespace", () => {
    expect(parseLine("oc get nodes")).toEqual(["oc", "get", "nodes"]);
  });

  it("collapses repeated whitespace", () => {
    expect(parseLine("oc   get    nodes")).toEqual(["oc", "get", "nodes"]);
  });

  it("trims leading/trailing whitespace", () => {
    expect(parseLine("  oc get nodes  ")).toEqual(["oc", "get", "nodes"]);
  });

  it("returns an empty array for a blank line", () => {
    expect(parseLine("   ")).toEqual([]);
    expect(parseLine("")).toEqual([]);
  });
});
