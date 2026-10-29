import type { FaultSpec, ScenarioStep } from "../../engine/scenario";
import { replaceEventsAndGate } from "./shared";

const CLUSTER = "demo";
const BASE_DOMAIN = "lab.example.com";
const WILDCARD = `*.apps.${CLUSTER}.${BASE_DOMAIN}`;
const DEGRADED_OPERATORS = new Set(["authentication", "console"]);

export const missingAppsWildcard: FaultSpec = {
  id: "missing-apps-wildcard",
  rewrite: (steps) => {
    const withoutWildcard: ScenarioStep[] = [
      { kind: "event", event: { t: 1, type: "dns.record", name: WILDCARD, action: "remove" } },
      ...steps,
    ];

    const faulted = replaceEventsAndGate(
      withoutWildcard,
      (step) => step.event.type === "co.status" && DEGRADED_OPERATORS.has(step.event.name),
      (step) => {
        if (step.event.type !== "co.status") return [step];
        return [
          {
            kind: "event",
            event: { t: step.event.t, type: "co.status", name: step.event.name, available: false, progressing: false, degraded: true },
          },
        ];
      },
      {
        kind: "gate",
        gateId: "fix-apps-wildcard",
        prompt: `Ingress is up, but authentication and console are degraded — they need working ${WILDCARD} DNS.`,
        hint: `Run \`dig test.apps.${CLUSTER}.${BASE_DOMAIN}\` to confirm, then \`lab dns add ${WILDCARD} 192.168.1.10\`.`,
        check: (s) => s.dns[WILDCARD] !== undefined,
      }
    );

    const gateIndex = faulted.findIndex((s) => s.kind === "gate" && s.gateId === "fix-apps-wildcard");
    const gateT = findGateTime(faulted, gateIndex);
    const recovery: ScenarioStep[] = [...DEGRADED_OPERATORS].map((name) => ({
      kind: "event",
      event: { t: gateT + 1, type: "co.status", name, available: true, progressing: false, degraded: false },
    }));
    faulted.splice(gateIndex + 1, 0, ...recovery);

    return faulted;
  },
};

function findGateTime(steps: ScenarioStep[], gateIndex: number): number {
  for (let i = gateIndex - 1; i >= 0; i--) {
    const step = steps[i];
    if (step?.kind === "event") return step.event.t;
  }
  return 0;
}
