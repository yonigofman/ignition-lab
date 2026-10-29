import { describe, expect, it } from "vitest";
import { reduceAll } from "../../src/engine/reducer";
import { createInitialSnapshot } from "../../src/engine/snapshot";
import { upiCompact3Node } from "../../src/scenarios/upi-compact-3node";
import { deriveInspectorView } from "../../src/ui/inspector/deriveInspectorView";
import { fullEventsFor } from "../helpers/fullScenarioEvents";

const events = fullEventsFor(upiCompact3Node);

function snapshotAt(t: number) {
  return reduceAll(events, t, createInitialSnapshot(upiCompact3Node.initialState));
}

describe("deriveInspectorView", () => {
  it("returns null when no node is selected", () => {
    expect(deriveInspectorView(snapshotAt(50), events, null)).toBeNull();
  });

  it("returns role/ip/phase/rebootCount for the selected node at the given time", () => {
    const view = deriveInspectorView(snapshotAt(90), events, "master-0");
    expect(view).toMatchObject({
      nodeId: "master-0",
      role: "master",
      ip: "192.168.1.21",
      phase: "ready",
      rebootCount: 2,
    });
  });

  it("defaults a never-touched node to off with no ip", () => {
    const view = deriveInspectorView(snapshotAt(0), events, "master-0");
    expect(view).toMatchObject({ nodeId: "master-0", phase: "off", power: "off", ip: undefined });
  });

  it("reports the ignition file most recently fetched by the node, or null before any fetch", () => {
    const before = deriveInspectorView(snapshotAt(29), events, "master-0");
    expect(before?.ignitionFile).toBeNull();

    const after = deriveInspectorView(snapshotAt(30), events, "master-0");
    expect(after?.ignitionFile).toBe("master.ign");
  });

  it("includes only log lines that mention the selected node", () => {
    const view = deriveInspectorView(snapshotAt(92), events, "master-1");
    expect(view?.recentLog.length).toBeGreaterThan(0);
    for (const line of view?.recentLog ?? []) {
      expect(line.includes("master-1")).toBe(true);
    }
  });

  it("caps recent log lines at the given limit", () => {
    const view = deriveInspectorView(snapshotAt(150), events, "master-0", 2);
    expect(view?.recentLog.length).toBeLessThanOrEqual(2);
  });

  it("produces the identical view when called twice for the same time", () => {
    const a = deriveInspectorView(snapshotAt(60), events, "bootstrap");
    const b = deriveInspectorView(snapshotAt(60), events, "bootstrap");
    expect(a).toEqual(b);
  });
});
