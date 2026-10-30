import type { NodeId } from "./events";

export type NodeRole = "helper" | "lb" | "bootstrap" | "master" | "worker" | "provisioning";
export type NodePhase = "off" | "booting" | "installing" | "ready" | "failed";
export type InstallPhase =
  | "not-started"
  | "bootstrapping"
  | "bootstrap-complete"
  | "converging"
  | "complete"
  | "failed";
export type LbFrontend = 6443 | 22623 | 80 | 443;
export const LB_FRONTENDS: LbFrontend[] = [6443, 22623, 80, 443];
export type LbBackendState = "up" | "down" | "removed";
export type CsrStatus = "pending" | "approved";

export type RebootReason = "install-to-disk" | "mcd-pivot" | "other";

export interface NodeState {
  id: NodeId;
  role?: NodeRole;
  power: "on" | "off";
  ip?: string;
  phase: NodePhase;
  rebootCount: number;
  lastRebootReason?: RebootReason;
  ready: boolean;
  registeredAt?: number;
  /** Mirrors Kubernetes' own `spec.unschedulable` - false while cordoned (e.g. mid-upgrade rollout). */
  schedulable: boolean;
}

export interface ClusterVersionState {
  current: string;
  desired: string;
  progressing: boolean;
}

export interface Csr {
  id: string;
  node: NodeId;
  kind: "client" | "serving";
  status: CsrStatus;
  approvedBy?: "auto" | "learner" | "machine-approver";
  createdAt: number;
}

export interface ClusterOperatorStatus {
  name: string;
  available: boolean;
  progressing: boolean;
  degraded: boolean;
  since: number;
}

export interface ClusterSnapshot {
  t: number;
  phase: InstallPhase;
  failureReason?: string;
  nodes: Record<NodeId, NodeState>;
  dns: Record<string, string>;
  lb: Record<LbFrontend, Record<NodeId, LbBackendState>>;
  etcdMembers: NodeId[];
  csrs: Csr[];
  clusterOperators: Record<string, ClusterOperatorStatus>;
  clusterVersion: ClusterVersionState;
  log: string[];
}

export function defaultNodeState(id: NodeId): NodeState {
  return { id, power: "off", phase: "off", rebootCount: 0, ready: false, schedulable: true };
}

export function createInitialSnapshot(initialState: Partial<ClusterSnapshot> = {}): ClusterSnapshot {
  return {
    t: 0,
    phase: "not-started",
    nodes: {},
    dns: {},
    lb: { 6443: {}, 22623: {}, 80: {}, 443: {} },
    etcdMembers: [],
    csrs: [],
    clusterOperators: {},
    clusterVersion: { current: "", desired: "", progressing: false },
    log: [],
    ...initialState,
  };
}
