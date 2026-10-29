import { describe, expect, it } from "vitest";
import { reduceAll } from "../../src/engine/reducer";
import { createInitialSnapshot } from "../../src/engine/snapshot";
import { upiCompact3Node } from "../../src/scenarios/upi-compact-3node";
import { deriveTopologyView } from "../../src/ui/topology/deriveTopologyView";
import { fullEventsFor } from "../helpers/fullScenarioEvents";

const events = fullEventsFor(upiCompact3Node);

function snapshotAt(t: number) {
  return reduceAll(events, t, createInitialSnapshot(upiCompact3Node.initialState));
}

describe("deriveTopologyView", () => {
  it("lists every topology node, defaulting untouched nodes to off", () => {
    const view = deriveTopologyView(snapshotAt(0), upiCompact3Node.topology, events);
    const ids = view.nodes.map((n) => n.id);
    expect(ids.sort()).toEqual(["bootstrap", "helper", "lb", "master-0", "master-1", "master-2"].sort());

    const masterZero = view.nodes.find((n) => n.id === "master-0");
    expect(masterZero).toMatchObject({ power: "off", phase: "off" });
  });

  it("assigns zones: helper/lb are infra, bootstrap/masters are cluster", () => {
    const view = deriveTopologyView(snapshotAt(0), upiCompact3Node.topology, events);
    expect(view.nodes.find((n) => n.id === "helper")?.zone).toBe("infra");
    expect(view.nodes.find((n) => n.id === "lb")?.zone).toBe("infra");
    expect(view.nodes.find((n) => n.id === "bootstrap")?.zone).toBe("cluster");
    expect(view.nodes.find((n) => n.id === "master-0")?.zone).toBe("cluster");
  });

  it("reflects node power/phase at the given time", () => {
    const view = deriveTopologyView(snapshotAt(20), upiCompact3Node.topology, events);
    const masterZero = view.nodes.find((n) => n.id === "master-0");
    expect(masterZero).toMatchObject({ power: "on" });
  });

  it("marks etcd members once they join and not before", () => {
    const before = deriveTopologyView(snapshotAt(49), upiCompact3Node.topology, events);
    expect(before.nodes.find((n) => n.id === "master-0")?.etcdMember).toBe(false);

    const after = deriveTopologyView(snapshotAt(50), upiCompact3Node.topology, events);
    expect(after.nodes.find((n) => n.id === "master-0")?.etcdMember).toBe(true);
    expect(after.etcdMembers).toEqual(["master-0"]);
  });

  it("produces an ignition edge while an ignition.fetched event is within the active window", () => {
    const withinWindow = deriveTopologyView(snapshotAt(30.5), upiCompact3Node.topology, events, 2);
    expect(
      withinWindow.edges.some((e) => e.category === "ignition" && e.from === "helper" && e.to === "master-0")
    ).toBe(true);

    const outsideWindow = deriveTopologyView(snapshotAt(40), upiCompact3Node.topology, events, 2);
    expect(
      outsideWindow.edges.some((e) => e.category === "ignition" && e.from === "helper" && e.to === "master-0")
    ).toBe(false);
  });

  it("categorizes MCS traffic separately from a plain ignition fetch", () => {
    const view = deriveTopologyView(snapshotAt(35.5), upiCompact3Node.topology, events, 2);
    expect(view.edges.some((e) => e.category === "mcs" && e.from === "bootstrap" && e.to === "master-0")).toBe(
      true
    );
  });

  it("marks a node active while any event touches it within the active window", () => {
    const active = deriveTopologyView(snapshotAt(90), upiCompact3Node.topology, events, 1);
    expect(active.nodes.find((n) => n.id === "master-0")?.active).toBe(true);

    const idle = deriveTopologyView(snapshotAt(93), upiCompact3Node.topology, events, 1);
    expect(idle.nodes.find((n) => n.id === "master-0")?.active).toBe(false);
  });

  it("distinguishes install-to-disk and mcd-pivot reboots by their last reason", () => {
    const afterInstallReboot = deriveTopologyView(snapshotAt(33), upiCompact3Node.topology, events);
    expect(afterInstallReboot.nodes.find((n) => n.id === "master-0")?.lastRebootReason).toBe(
      "install-to-disk"
    );

    const afterPivotReboot = deriveTopologyView(snapshotAt(87), upiCompact3Node.topology, events);
    expect(afterPivotReboot.nodes.find((n) => n.id === "master-0")?.lastRebootReason).toBe("mcd-pivot");
  });

  it("marks bootstrap removed once it is powered off after bootstrap.removed, and not before", () => {
    const before = deriveTopologyView(snapshotAt(69), upiCompact3Node.topology, events);
    expect(before.nodes.find((n) => n.id === "bootstrap")?.removed).toBe(false);

    const after = deriveTopologyView(snapshotAt(70), upiCompact3Node.topology, events);
    expect(after.nodes.find((n) => n.id === "bootstrap")?.removed).toBe(true);

    const masterZero = after.nodes.find((n) => n.id === "master-0");
    expect(masterZero?.removed).toBe(false);
  });

  it("produces the identical view when called twice for the same time", () => {
    const a = deriveTopologyView(snapshotAt(35), upiCompact3Node.topology, events);
    const b = deriveTopologyView(snapshotAt(35), upiCompact3Node.topology, events);
    expect(a).toEqual(b);
  });

  it("marks only the requested node as highlighted, independent of activity/selection", () => {
    const view = deriveTopologyView(snapshotAt(0), upiCompact3Node.topology, events, 2, "bootstrap");
    expect(view.nodes.find((n) => n.id === "bootstrap")?.highlighted).toBe(true);
    expect(view.nodes.find((n) => n.id === "master-0")?.highlighted).toBe(false);
  });

  it("highlights nothing when no node id is given", () => {
    const view = deriveTopologyView(snapshotAt(0), upiCompact3Node.topology, events);
    expect(view.nodes.every((n) => !n.highlighted)).toBe(true);
  });
});
