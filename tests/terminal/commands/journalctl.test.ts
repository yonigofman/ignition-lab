import { describe, expect, it } from "vitest";
import { reduceAll } from "../../../src/engine/reducer";
import { createInitialSnapshot } from "../../../src/engine/snapshot";
import { SimulatorSource } from "../../../src/engine/sources/SimulatorSource";
import { upiCompact3Node } from "../../../src/scenarios/upi-compact-3node";
import { journalctl } from "../../../src/terminal/commands/journalctl";

const events = new SimulatorSource(upiCompact3Node).getEvents();
function snapshotAt(t: number) {
  return reduceAll(events, t, createInitialSnapshot(upiCompact3Node.initialState));
}

describe("journalctl", () => {
  it("shows bootstrap-related log lines up to the current time", () => {
    const result = journalctl(["-b", "-f", "-u", "release-image.service", "-u", "bootkube.service"], snapshotAt(60));
    expect(result.output).toMatch(/bootstrap/i);
  });

  it("shows nothing before bootstrap has powered on", () => {
    const result = journalctl(["-u", "bootkube.service"], createInitialSnapshot());
    expect(result.output).toMatch(/no entries|empty/i);
  });

  it("never shows lines from after the current snapshot time", () => {
    const early = journalctl(["-u", "bootkube.service"], snapshotAt(10));
    expect(early.output).not.toMatch(/bootstrap complete/i);
  });
});
