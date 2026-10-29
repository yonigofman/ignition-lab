import type { FaultSpec, ScenarioStep } from "../../engine/scenario";
import { replaceEventsAndGate } from "./shared";

const CLUSTER = "demo";
const BASE_DOMAIN = "lab.example.com";
const API_INT = `api-int.${CLUSTER}.${BASE_DOMAIN}`;

export const missingApiIntDns: FaultSpec = {
  id: "missing-api-int-dns",
  rewrite: (steps) => {
    const withoutRecord: ScenarioStep[] = [
      { kind: "event", event: { t: 1, type: "dns.record", name: API_INT, action: "remove" } },
      ...steps,
    ];

    return replaceEventsAndGate(
      withoutRecord,
      (step) => step.event.type === "ignition.mcs_served" && step.event.pool === "master",
      (step) => {
        if (step.event.type !== "ignition.mcs_served") return [step];
        const masterId = step.event.from;
        return [
          {
            kind: "event",
            event: { t: step.event.t, type: "dns.query", from: masterId, name: API_INT, result: "nxdomain" },
          },
          {
            kind: "event",
            event: {
              t: step.event.t + 0.5,
              type: "ignition.failed",
              node: masterId,
              reason: `could not resolve ${API_INT}`,
            },
          },
        ];
      },
      {
        kind: "gate",
        gateId: "fix-api-int-dns",
        prompt: `Masters can't resolve ${API_INT} — their ignition fetch is failing.`,
        hint: `Run \`dig ${API_INT}\` to confirm, then \`lab dns add ${API_INT} 192.168.1.10\`.`,
        check: (s) => s.dns[API_INT] !== undefined,
      }
    );
  },
};
