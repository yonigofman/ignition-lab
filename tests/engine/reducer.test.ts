import { describe, expect, it } from "vitest";
import type { InstallEvent } from "../../src/engine/events";
import { reduce } from "../../src/engine/reducer";
import { createInitialSnapshot } from "../../src/engine/snapshot";

function at<T extends InstallEvent>(event: T): T {
  return event;
}

describe("reduce", () => {
  it("vm.power on turns an off node booting and does not touch other nodes", () => {
    const s0 = createInitialSnapshot();
    const s1 = reduce(s0, at({ t: 1, type: "vm.power", node: "bootstrap", state: "on" }));
    expect(s1.nodes.bootstrap).toMatchObject({ power: "on", phase: "booting" });
    expect(s1.nodes["master-0"]).toBeUndefined();
  });

  it("vm.power off sets power and phase off", () => {
    const s0 = createInitialSnapshot();
    const s1 = reduce(s0, at({ t: 1, type: "vm.power", node: "bootstrap", state: "on" }));
    const s2 = reduce(s1, at({ t: 2, type: "vm.power", node: "bootstrap", state: "off" }));
    expect(s2.nodes.bootstrap).toMatchObject({ power: "off", phase: "off" });
  });

  it("vm.reboot increments rebootCount, records the reason, and sets phase booting", () => {
    const s0 = createInitialSnapshot();
    const s1 = reduce(s0, at({ t: 1, type: "vm.reboot", node: "master-0", reason: "install-to-disk" }));
    expect(s1.nodes["master-0"]).toMatchObject({
      rebootCount: 1,
      phase: "booting",
      lastRebootReason: "install-to-disk",
    });
    const s2 = reduce(s1, at({ t: 2, type: "vm.reboot", node: "master-0", reason: "mcd-pivot" }));
    expect(s2.nodes["master-0"]).toMatchObject({ rebootCount: 2, lastRebootReason: "mcd-pivot" });
  });

  it("dhcp.lease sets node ip", () => {
    const s0 = createInitialSnapshot();
    const s1 = reduce(s0, at({ t: 1, type: "dhcp.lease", node: "master-0", ip: "10.0.0.5" }));
    expect(s1.nodes["master-0"]?.ip).toBe("10.0.0.5");
  });

  it("dns.query does not mutate node/dns state, only logs", () => {
    const s0 = createInitialSnapshot();
    const s1 = reduce(
      s0,
      at({ t: 1, type: "dns.query", from: "master-0", name: "api-int.lab.example.com", result: "ok" })
    );
    expect(s1.dns).toEqual({});
    expect(s1.log).toHaveLength(1);
  });

  it("lb.backend sets backend state for a frontend without touching other frontends", () => {
    const s0 = createInitialSnapshot();
    const s1 = reduce(s0, at({ t: 1, type: "lb.backend", frontend: 6443, backend: "bootstrap", state: "up" }));
    expect(s1.lb[6443].bootstrap).toBe("up");
    expect(s1.lb[22623]).toEqual({});
  });

  it("bmc.power reset increments rebootCount", () => {
    const s0 = createInitialSnapshot();
    const s1 = reduce(
      s0,
      at({ t: 1, type: "bmc.power", node: "master-0", protocol: "redfish", action: "reset" })
    );
    expect(s1.nodes["master-0"]).toMatchObject({ power: "on", rebootCount: 1 });
  });

  it("ignition.fetched sets node phase installing", () => {
    const s0 = createInitialSnapshot();
    const s1 = reduce(
      s0,
      at({ t: 1, type: "ignition.fetched", node: "master-0", file: "master.ign", from: "helper" })
    );
    expect(s1.nodes["master-0"]?.phase).toBe("installing");
  });

  it("ignition.failed sets node phase failed", () => {
    const s0 = createInitialSnapshot();
    const s1 = reduce(s0, at({ t: 1, type: "ignition.failed", node: "master-0", reason: "nxdomain" }));
    expect(s1.nodes["master-0"]?.phase).toBe("failed");
  });

  it("etcd.member_joined appends node once, no duplicates", () => {
    const s0 = createInitialSnapshot();
    const s1 = reduce(s0, at({ t: 1, type: "etcd.member_joined", node: "master-0" }));
    const s2 = reduce(s1, at({ t: 2, type: "etcd.member_joined", node: "master-0" }));
    expect(s2.etcdMembers).toEqual(["master-0"]);
  });

  it("ignition.mcs_served logs without mutating node/cluster state", () => {
    const s0 = createInitialSnapshot();
    const s1 = reduce(
      s0,
      at({ t: 1, type: "ignition.mcs_served", node: "bootstrap", pool: "master", from: "master-0", via: "lb" })
    );
    expect(s1.nodes).toEqual({});
    expect(s1.log).toHaveLength(1);
  });

  it("bootstrap.temp_control_plane_up logs without mutating node/cluster state", () => {
    const s0 = createInitialSnapshot();
    const s1 = reduce(s0, at({ t: 1, type: "bootstrap.temp_control_plane_up" }));
    expect(s1.nodes).toEqual({});
    expect(s1.phase).toBe("bootstrapping");
    expect(s1.log).toHaveLength(1);
  });

  it("controlplane.pod_scheduled logs without mutating node/cluster state", () => {
    const s0 = createInitialSnapshot();
    const s1 = reduce(
      s0,
      at({ t: 1, type: "controlplane.pod_scheduled", node: "master-0", component: "kube-apiserver" })
    );
    expect(s1.nodes).toEqual({});
    expect(s1.log).toHaveLength(1);
  });

  it("bootstrap.complete sets phase bootstrap-complete", () => {
    const s0 = createInitialSnapshot();
    const s1 = reduce(s0, at({ t: 1, type: "bootstrap.complete" }));
    expect(s1.phase).toBe("bootstrap-complete");
  });

  it("bootstrap.removed sets phase converging and powers off bootstrap", () => {
    const s0 = createInitialSnapshot();
    const s1 = reduce(s0, at({ t: 1, type: "vm.power", node: "bootstrap", state: "on" }));
    const s2 = reduce(s1, at({ t: 2, type: "bootstrap.removed", node: "bootstrap" }));
    expect(s2.phase).toBe("converging");
    expect(s2.nodes.bootstrap?.power).toBe("off");
  });

  it("node.registered sets role", () => {
    const s0 = createInitialSnapshot();
    const s1 = reduce(s0, at({ t: 1, type: "node.registered", node: "master-0", role: "master" }));
    expect(s1.nodes["master-0"]?.role).toBe("master");
  });

  it("node.ready true sets ready and phase ready", () => {
    const s0 = createInitialSnapshot();
    const s1 = reduce(s0, at({ t: 1, type: "node.ready", node: "master-0", ready: true }));
    expect(s1.nodes["master-0"]).toMatchObject({ ready: true, phase: "ready" });
  });

  it("csr.created then csr.approved transitions status and records approver", () => {
    const s0 = createInitialSnapshot();
    const s1 = reduce(
      s0,
      at({ t: 1, type: "csr.created", id: "csr-1", node: "worker-0", kind: "client" })
    );
    expect(s1.csrs).toEqual([{ id: "csr-1", node: "worker-0", kind: "client", status: "pending" }]);
    const s2 = reduce(s1, at({ t: 2, type: "csr.approved", id: "csr-1", by: "learner" }));
    expect(s2.csrs).toEqual([
      { id: "csr-1", node: "worker-0", kind: "client", status: "approved", approvedBy: "learner" },
    ]);
  });

  it("co.status records operator status by name", () => {
    const s0 = createInitialSnapshot();
    const s1 = reduce(
      s0,
      at({ t: 1, type: "co.status", name: "etcd", available: true, progressing: false, degraded: false })
    );
    expect(s1.clusterOperators.etcd).toEqual({
      name: "etcd",
      available: true,
      progressing: false,
      degraded: false,
    });
  });

  it("install.complete and install.failed set phase and failureReason", () => {
    const s0 = createInitialSnapshot();
    const complete = reduce(s0, at({ t: 1, type: "install.complete" }));
    expect(complete.phase).toBe("complete");

    const failed = reduce(s0, at({ t: 1, type: "install.failed", reason: "ignition expired" }));
    expect(failed.phase).toBe("failed");
    expect(failed.failureReason).toBe("ignition expired");
  });

  it("every event type appends exactly one log line and advances t", () => {
    const s0 = createInitialSnapshot();
    const s1 = reduce(s0, at({ t: 42, type: "cvo.started" }));
    expect(s1.log).toHaveLength(1);
    expect(s1.t).toBe(42);
  });

  it("learner.action and lesson.gate are logged without throwing", () => {
    const s0 = createInitialSnapshot();
    const s1 = reduce(s0, at({ t: 1, type: "learner.action", action: "approve-csr" }));
    const s2 = reduce(s1, at({ t: 2, type: "lesson.gate", gateId: "g1", state: "waiting" }));
    expect(s2.log).toHaveLength(2);
  });

  it("does not mutate the input snapshot", () => {
    const s0 = createInitialSnapshot();
    const frozen = JSON.parse(JSON.stringify(s0));
    reduce(s0, at({ t: 1, type: "vm.power", node: "bootstrap", state: "on" }));
    expect(s0).toEqual(frozen);
  });
});
