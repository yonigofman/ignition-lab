import { describe, expect, it } from "vitest";
import { highlightLine } from "../../src/ui/artifacts/highlightLine";

function plain(tokens: ReturnType<typeof highlightLine>): string {
  return tokens.map((t) => t.text).join("");
}

describe("highlightLine", () => {
  it("reassembles to the exact original line regardless of shape", () => {
    const lines = [
      "apiVersion: v1",
      '  "ignition": { "version": "3.2.0" },',
      "  - name: worker",
      "REDACTED-fake-placeholder-password",
      "# a comment",
      "}",
    ];
    for (const line of lines) {
      expect(plain(highlightLine(line, "yaml"))).toBe(line);
    }
  });

  it("colors a yaml key distinctly from its value", () => {
    const tokens = highlightLine("baseDomain: lab.example.com", "yaml");
    const keyToken = tokens.find((t) => t.text === "baseDomain");
    expect(keyToken?.className).toContain("text-sky-400");
  });

  it("colors quoted strings distinctly", () => {
    const tokens = highlightLine('  "version": "3.2.0"', "json");
    const valueToken = tokens.find((t) => t.text === '"3.2.0"');
    expect(valueToken?.className).toContain("text-emerald-400");
  });

  it("renders a whole comment line as muted/italic, untouched otherwise", () => {
    const tokens = highlightLine("# just a comment", "yaml");
    expect(tokens).toHaveLength(1);
    expect(tokens[0]?.className).toContain("italic");
  });

  it("leaves a line with no colon and no quotes as a single plain token", () => {
    const tokens = highlightLine("REDACTED-fake-placeholder-password", "yaml");
    expect(tokens).toEqual([{ text: "REDACTED-fake-placeholder-password", className: "" }]);
  });

  it("never tokenizes a text artifact as code, even if a value contains a colon", () => {
    const tokens = highlightLine('generated-at: "2026-10-29T00:00:00Z"', "text");
    expect(tokens).toEqual([{ text: 'generated-at: "2026-10-29T00:00:00Z"', className: "" }]);
  });
});
