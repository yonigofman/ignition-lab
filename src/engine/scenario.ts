import type { InstallEvent, NodeId } from "./events";
import type { ClusterSnapshot, NodeRole } from "./snapshot";

export interface TopologyNode {
  id: NodeId;
  role: NodeRole;
  label: string;
}

export interface TopologyLink {
  source: NodeId;
  target: NodeId;
}

export interface Scenario {
  id: string;
  title: string;
  mode: "upi" | "ipi-baremetal";
  topology: { nodes: TopologyNode[]; links: TopologyLink[] };
  initialState: Partial<ClusterSnapshot>;
  steps: ScenarioStep[];
}

export type ScenarioStep =
  | { kind: "event"; event: InstallEvent }
  | { kind: "gate"; gateId: string; prompt: string; check: (s: ClusterSnapshot) => boolean; hint?: string }
  | { kind: "predict"; question: string; options: string[]; answer: number; explain: string }
  | { kind: "chapter"; title: string; lesson?: string };

export interface FaultSpec {
  id: string;
  rewrite: (steps: ScenarioStep[]) => ScenarioStep[];
}

export function applyFault(scenario: Scenario, fault: FaultSpec): Scenario {
  return {
    ...scenario,
    id: `${scenario.id}+${fault.id}`,
    steps: fault.rewrite(scenario.steps),
  };
}
