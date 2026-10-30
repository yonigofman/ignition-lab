import type { InstallEvent } from "../../engine/events";
import type { ClusterSnapshot } from "../../engine/snapshot";
import { formatAge } from "../formatAge";
import { registry } from "../registry";
import { formatTable } from "../table";
import type { Command, CommandResult } from "../types";

const SIGNER_NAME: Record<"client" | "serving", string> = {
  client: "kubernetes.io/kube-apiserver-client-kubelet",
  serving: "kubernetes.io/kubelet-serving",
};

function learnerAction(t: number, action: string, payload: unknown): InstallEvent {
  return { t, type: "learner.action", action, payload };
}

function getNodes(snapshot: ClusterSnapshot): CommandResult {
  const nodes = Object.values(snapshot.nodes).filter(
    (n) => (n.role === "master" || n.role === "worker") && n.registeredAt !== undefined
  );

  if (nodes.length === 0) {
    return { output: "No resources found" };
  }

  const rows = nodes.map((n) => {
    const status = n.ready ? "Ready" : "NotReady";
    return [
      n.id,
      n.schedulable === false ? `${status},SchedulingDisabled` : status,
      n.role ?? "",
      formatAge(snapshot.t - (n.registeredAt ?? snapshot.t)),
    ];
  });
  return { output: formatTable(["NAME", "STATUS", "ROLES", "AGE"], rows) };
}

function getCsr(snapshot: ClusterSnapshot): CommandResult {
  if (snapshot.csrs.length === 0) {
    return { output: "No resources found" };
  }

  const rows = snapshot.csrs.map((csr) => [
    csr.id,
    formatAge(snapshot.t - csr.createdAt),
    SIGNER_NAME[csr.kind],
    csr.status === "approved" ? "Approved,Issued" : "Pending",
  ]);
  return { output: formatTable(["NAME", "AGE", "SIGNERNAME", "CONDITION"], rows) };
}

function bool(value: boolean): string {
  return value ? "True" : "False";
}

function getCo(snapshot: ClusterSnapshot): CommandResult {
  const operators = Object.values(snapshot.clusterOperators);
  if (operators.length === 0) {
    return { output: "No resources found" };
  }

  const rows = operators.map((co) => [
    co.name,
    bool(co.available),
    bool(co.progressing),
    bool(co.degraded),
    formatAge(snapshot.t - co.since),
  ]);
  return { output: formatTable(["NAME", "AVAILABLE", "PROGRESSING", "DEGRADED", "AGE"], rows) };
}

function getClusterVersion(snapshot: ClusterSnapshot): CommandResult {
  const cv = snapshot.clusterVersion;
  // Scenarios that model a real ClusterVersion (upgrades) seed `current` in
  // initialState; install scenarios never touch this field, so they fall back
  // to the original install-phase-based reading.
  if (cv.current || cv.desired) {
    // VERSION stays on the current (old) version for the whole rollout - it only
    // becomes the desired version once the update actually completes. AVAILABLE
    // stays True throughout too: the entire point of a rolling, one-node-at-a-time
    // upgrade is that the cluster keeps serving while it happens.
    const row = ["version", cv.current || cv.desired, bool(Boolean(cv.current)), bool(cv.progressing), formatAge(snapshot.t)];
    return { output: formatTable(["NAME", "VERSION", "AVAILABLE", "PROGRESSING", "SINCE"], [row]) };
  }

  const available = snapshot.phase === "complete";
  const progressing = !available && snapshot.phase !== "failed";
  const row = ["version", bool(available), bool(progressing), formatAge(snapshot.t)];
  return { output: formatTable(["NAME", "AVAILABLE", "PROGRESSING", "SINCE"], [row]) };
}

const MCP_ROLES: Array<"master" | "worker"> = ["master", "worker"];

function getMcp(snapshot: ClusterSnapshot): CommandResult {
  const rows = MCP_ROLES.map((role) => {
    const pool = Object.values(snapshot.nodes).filter((n) => n.role === role);
    // "Updated" means this node has actually pivoted onto the current machine config
    // (the same mcd-pivot reboot already used for the first rollout at install time) -
    // not just "currently ready", which a node that hasn't rolled yet also is. Without
    // this, an untouched node sitting on its pre-upgrade config would misreport as
    // already updated.
    const updating = pool.filter((n) => n.schedulable === false || (n.lastRebootReason === "mcd-pivot" && !n.ready));
    const updated = pool.filter((n) => n.ready && n.schedulable !== false && n.lastRebootReason === "mcd-pivot");
    const degraded = pool.filter((n) => n.phase === "failed");

    return [
      role,
      bool(pool.length > 0 && updated.length === pool.length),
      bool(updating.length > 0),
      bool(degraded.length > 0),
      `${pool.length}`,
      `${updated.length}`,
      `${degraded.length}`,
    ];
  });
  return {
    output: formatTable(
      ["NAME", "UPDATED", "UPDATING", "DEGRADED", "MACHINECOUNT", "READYMACHINECOUNT", "DEGRADEDMACHINECOUNT"],
      rows
    ),
  };
}

function get(args: string[], snapshot: ClusterSnapshot): CommandResult {
  const resource = args[0];
  switch (resource) {
    case "nodes":
      return getNodes(snapshot);
    case "csr":
      return getCsr(snapshot);
    case "co":
      return getCo(snapshot);
    case "clusterversion":
      return getClusterVersion(snapshot);
    case "mcp":
      return getMcp(snapshot);
    default:
      return { output: `error: the server doesn't have a resource type "${resource ?? ""}" (not supported by this simulator)` };
  }
}

function approveCertificate(args: string[], snapshot: ClusterSnapshot): CommandResult {
  const name = args[0];
  const csr = snapshot.csrs.find((c) => c.id === name);

  if (!csr) {
    return { output: `error: certificatesigningrequests.certificates.k8s.io "${name ?? ""}" not found` };
  }
  if (csr.status === "approved") {
    return { output: `error: certificate signing request "${name}" is already approved` };
  }

  const event: InstallEvent = { t: snapshot.t, type: "csr.approved", id: csr.id, by: "learner" };
  return {
    output: `certificatesigningrequest.certificates.k8s.io/${csr.id} approved`,
    dispatch: [event],
  };
}

function upgrade(args: string[], snapshot: ClusterSnapshot): CommandResult {
  const toArg = args.find((a) => a.startsWith("--to="));

  if (!toArg) {
    const cv = snapshot.clusterVersion;
    if (cv.progressing) {
      return { output: `info: An upgrade is in progress. Working towards ${cv.desired}` };
    }
    return {
      output: `Cluster version is ${cv.current || "unknown"}\n\nRun \`oc adm upgrade --to=<version>\` to start an upgrade.`,
    };
  }

  const desired = toArg.slice("--to=".length);
  if (!desired) {
    return { output: "error: --to requires a version, e.g. --to=4.15.3" };
  }
  if (snapshot.clusterVersion.progressing) {
    return { output: `error: an upgrade to ${snapshot.clusterVersion.desired} is already in progress` };
  }

  const event: InstallEvent = {
    t: snapshot.t,
    type: "clusterversion.update_started",
    desired,
    actor: "learner",
    contrastNote:
      "An upgrade always starts with a person deciding to run this - UPI or IPI, nothing about an upgrade is automatic the way bootstrap is.",
  };
  return {
    output: `Updating to release image for version ${desired}`,
    dispatch: [learnerAction(snapshot.t, "oc.adm.upgrade", { to: desired }), event],
  };
}

function adm(args: string[], snapshot: ClusterSnapshot): CommandResult {
  if (args[0] === "certificate" && args[1] === "approve") {
    return approveCertificate(args.slice(2), snapshot);
  }
  if (args[0] === "upgrade") {
    return upgrade(args.slice(1), snapshot);
  }
  return { output: `error: unknown command "oc adm ${args.join(" ")}"` };
}

export const oc: Command = (args, snapshot) => {
  switch (args[0]) {
    case "get":
      return get(args.slice(1), snapshot);
    case "adm":
      return adm(args.slice(1), snapshot);
    case undefined:
      return { output: registry.oc?.usage ?? "" };
    default:
      return { output: `error: unknown command "oc ${args.join(" ")}"\n\n${registry.oc?.usage ?? ""}` };
  }
};
