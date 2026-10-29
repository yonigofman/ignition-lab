import { describe, expect, it } from "vitest";
import { formatTable } from "../../src/terminal/table";

describe("formatTable", () => {
  it("pads columns to the widest cell in each column, separated by two spaces", () => {
    const out = formatTable(
      ["NAME", "STATUS"],
      [
        ["master-0", "Ready"],
        ["master-1", "NotReady"],
      ]
    );
    expect(out).toBe(["NAME      STATUS", "master-0  Ready", "master-1  NotReady"].join("\n"));
  });

  it("renders just the header when there are no rows", () => {
    expect(formatTable(["NAME"], [])).toBe("NAME");
  });

  it("handles a single column", () => {
    expect(formatTable(["NAME"], [["a"], ["bb"]])).toBe(["NAME", "a", "bb"].join("\n"));
  });
});
