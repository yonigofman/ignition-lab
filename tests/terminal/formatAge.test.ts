import { describe, expect, it } from "vitest";
import { formatAge } from "../../src/terminal/formatAge";

describe("formatAge", () => {
  it("formats under a minute as seconds", () => {
    expect(formatAge(0)).toBe("0s");
    expect(formatAge(45)).toBe("45s");
  });

  it("formats minutes and leftover seconds", () => {
    expect(formatAge(60)).toBe("1m");
    expect(formatAge(90)).toBe("1m30s");
  });

  it("formats hours and leftover minutes", () => {
    expect(formatAge(3600)).toBe("1h0m");
    expect(formatAge(3725)).toBe("1h2m");
  });

  it("clamps negative ages to 0s", () => {
    expect(formatAge(-5)).toBe("0s");
  });
});
