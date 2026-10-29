import type { InstallEvent } from "../../engine/events";
import type { ClusterSnapshot } from "../../engine/snapshot";
import { formatAge } from "../formatAge";
import { formatTable } from "../table";
import type { Command, CommandResult } from "../types";

const SIGNER_NAME: Record<"client" | "serving", string> = {
  client: "kubernetes.io/kube-apiserver-client-kubelet",
  serving: "kubernetes.io/kubelet-serving",
};

function getNodes(snapshot: ClusterSnapshot): CommandResult {
  const nodes = Object.values(snapshot.nodes).filter(
    (n) => (n.role === "master" || n.role === "worker") && n.registeredAt !== undefined
  );

  if (nodes.length === 0) {
    return { output: "No resources found" };
  }

  const rows = nodes.map((n) => [
    n.id,
    n.ready ? "Ready" : "NotReady",
    n.role ?? "",
    formatAge(snapshot.t - (n.registeredAt ?? snapshot.t)),
  ]);
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

function getCo(snapshot: ClusterSnapshot): CommandResult {
  const operators = Object.values(snapshot.clusterOperators);
  if (operators.length === 0) {
    return { output: "No resources found" };
  }

  const rows = operators.map((co) => [
    co.name,
    co.available ? "True" : "False",
    co.progressing ? "True" : "False",
    co.degraded ? "True" : "False",
    formatAge(snapshot.t - co.since),
  ]);
  return { output: formatTable(["NAME", "AVAILABLE", "PROGRESSING", "DEGRADED", "AGE"], rows) };
}

function getClusterVersion(snapshot: ClusterSnapshot): CommandResult {
  const available = snapshot.phase === "complete";
  const progressing = !available && snapshot.phase !== "failed";
  const row = [
    "version",
    available ? "True" : "False",
    progressing ? "True" : "False",
    formatAge(snapshot.t),
  ];
  return { output: formatTable(["NAME", "AVAILABLE", "PROGRESSING", "SINCE"], [row]) };
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

function adm(args: string[], snapshot: ClusterSnapshot): CommandResult {
  if (args[0] === "certificate" && args[1] === "approve") {
    return approveCertificate(args.slice(2), snapshot);
  }
  return { output: `error: unknown command "oc adm ${args.join(" ")}"` };
}

export const oc: Command = (args, snapshot) => {
  switch (args[0]) {
    case "get":
      return get(args.slice(1), snapshot);
    case "adm":
      return adm(args.slice(1), snapshot);
    default:
      return { output: `error: unknown command "oc ${args.join(" ")}"` };
  }
};
