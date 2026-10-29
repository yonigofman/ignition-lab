import { describe, expect, it } from "vitest";
import { maxEventTime } from "../../src/engine/events";

describe("maxEventTime", () => {
  it("returns 0 for an empty list", () => {
    expect(maxEventTime([])).toBe(0);
  });

  it("returns the largest t across events", () => {
    expect(
      maxEventTime([
        { t: 5, type: "cvo.started" },
        { t: 20, type: "install.complete" },
        { t: 1, type: "bootstrap.complete" },
      ])
    ).toBe(20);
  });
});
