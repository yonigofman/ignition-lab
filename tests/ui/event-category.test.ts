import { describe, expect, it } from "vitest";
import type { InstallEvent } from "../../src/engine/events";
import { categoryColor, eventCategory, isFailureEvent } from "../../src/ui/eventCategory";

function at<T extends InstallEvent>(event: T): T {
  return event;
}

describe("eventCategory", () => {
  it("categorizes infra events", () => {
    expect(eventCategory(at({ t: 0, type: "vm.power", node: "bootstrap", state: "on" }))).toBe("infra");
    expect(eventCategory(at({ t: 0, type: "dhcp.lease", node: "bootstrap", ip: "1.2.3.4" }))).toBe("infra");
    expect(
      eventCategory(at({ t: 0, type: "lb.backend", frontend: 6443, backend: "bootstrap", state: "up" }))
    ).toBe("infra");
  });

  it("categorizes ignition events", () => {
    expect(
      eventCategory(
        at({ t: 0, type: "ignition.fetched", node: "master-0", file: "master.ign", from: "helper" })
      )
    ).toBe("ignition");
    expect(eventCategory(at({ t: 0, type: "ignition.failed", node: "master-0", reason: "x" }))).toBe(
      "ignition"
    );
  });

  it("categorizes control-plane events", () => {
    expect(eventCategory(at({ t: 0, type: "bootstrap.complete" }))).toBe("control-plane");
    expect(eventCategory(at({ t: 0, type: "node.ready", node: "master-0", ready: true }))).toBe(
      "control-plane"
    );
    expect(eventCategory(at({ t: 0, type: "install.complete" }))).toBe("control-plane");
  });

  it("categorizes csr events", () => {
    expect(
      eventCategory(at({ t: 0, type: "csr.created", id: "c1", node: "worker-0", kind: "client" }))
    ).toBe("csr");
  });

  it("categorizes operator events", () => {
    expect(
      eventCategory(
        at({ t: 0, type: "co.status", name: "etcd", available: true, progressing: false, degraded: false })
      )
    ).toBe("operator");
  });

  it("categorizes learner and lesson events", () => {
    expect(eventCategory(at({ t: 0, type: "learner.action", action: "approve-csr" }))).toBe("learner");
    expect(eventCategory(at({ t: 0, type: "lesson.gate", gateId: "g1", state: "waiting" }))).toBe("lesson");
  });

  it("gives every category a distinct color", () => {
    const categories = ["infra", "ignition", "control-plane", "csr", "operator", "learner", "lesson"] as const;
    const colors = categories.map((c) => categoryColor(c));
    expect(new Set(colors).size).toBe(categories.length);
  });
});

describe("isFailureEvent", () => {
  it("flags ignition.failed and install.failed", () => {
    expect(isFailureEvent(at({ t: 0, type: "ignition.failed", node: "master-0", reason: "x" }))).toBe(true);
    expect(isFailureEvent(at({ t: 0, type: "install.failed", reason: "x" }))).toBe(true);
  });

  it("flags nxdomain dns.query but not ok", () => {
    expect(
      isFailureEvent(at({ t: 0, type: "dns.query", from: "master-0", name: "api-int", result: "nxdomain" }))
    ).toBe(true);
    expect(
      isFailureEvent(at({ t: 0, type: "dns.query", from: "master-0", name: "api-int", result: "ok" }))
    ).toBe(false);
  });

  it("flags degraded co.status but not healthy", () => {
    expect(
      isFailureEvent(
        at({ t: 0, type: "co.status", name: "console", available: false, progressing: false, degraded: true })
      )
    ).toBe(true);
    expect(
      isFailureEvent(
        at({ t: 0, type: "co.status", name: "console", available: true, progressing: false, degraded: false })
      )
    ).toBe(false);
  });

  it("does not flag ordinary events", () => {
    expect(isFailureEvent(at({ t: 0, type: "vm.power", node: "bootstrap", state: "on" }))).toBe(false);
  });
});
