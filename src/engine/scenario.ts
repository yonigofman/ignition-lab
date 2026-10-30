import { maxEventTime, type InstallEvent, type NodeId } from "./events";
import type { ClusterSnapshot, NodeRole } from "./snapshot";

export type TopologyZone = "infra" | "cluster" | "provisioning";

export interface TopologyNode {
  id: NodeId;
  role: NodeRole;
  label: string;
  /** Overrides the zone inferred from `role`. Needed for IPI, where the bootstrap VM runs on the provisioning host and so visually belongs with it, not with the cluster-network nodes. */
  zone?: TopologyZone;
}

export interface TopologyLink {
  source: NodeId;
  target: NodeId;
}

export interface ScenarioArtifact {
  id: string;
  path: string;
  language: "yaml" | "json" | "text";
  content: string;
  note?: string;
}

export interface Scenario {
  id: string;
  title: string;
  mode: "upi" | "ipi-baremetal";
  topology: { nodes: TopologyNode[]; links: TopologyLink[] };
  initialState: Partial<ClusterSnapshot>;
  steps: ScenarioStep[];
  artifacts: ScenarioArtifact[];
}

export type ScenarioStep =
  | { kind: "event"; event: InstallEvent }
  | {
      kind: "gate";
      gateId: string;
      prompt: string;
      check: (s: ClusterSnapshot) => boolean;
      hint?: string;
      /** The events that satisfy this gate, for callers with no one at the terminal to clear it by hand (demo mode). Optional: a gate with none just stays blocked there. */
      autoResolve?: (t: number) => InstallEvent[];
    }
  | { kind: "predict"; id?: string; question: string; options: string[]; answer: number; explain: string }
  | { kind: "chapter"; title: string; lesson?: string; caption?: string };

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

export function scenarioDuration(scenario: Scenario): number {
  const events = scenario.steps
    .filter((step): step is ScenarioStep & { kind: "event" } => step.kind === "event")
    .map((step) => step.event);
  return maxEventTime(events);
}

export interface ChapterMarker {
  title: string;
  t: number;
  caption?: string;
}

export function scenarioChapters(scenario: Scenario): ChapterMarker[] {
  const chapters: ChapterMarker[] = [];
  let pending: { title: string; caption?: string }[] = [];
  let lastEventT = 0;

  for (const step of scenario.steps) {
    if (step.kind === "chapter") {
      pending.push({ title: step.title, caption: step.caption });
      continue;
    }
    if (step.kind === "event") {
      for (const p of pending) {
        chapters.push({ ...p, t: step.event.t });
      }
      pending = [];
      lastEventT = step.event.t;
    }
  }
  for (const p of pending) {
    chapters.push({ ...p, t: lastEventT });
  }

  return chapters;
}
