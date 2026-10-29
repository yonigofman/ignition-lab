import type { FaultSpec, ScenarioStep } from "../../engine/scenario";
import { replaceEventsAndGate } from "./shared";

export const wrong22623Backend: FaultSpec = {
  id: "wrong-22623-backend",
  rewrite: (steps) => {
    const misconfigured: ScenarioStep[] = [
      {
        kind: "event",
        event: { t: 1, type: "lb.backend", frontend: 22623, backend: "bootstrap", state: "down" },
      },
      ...steps,
    ];

    return replaceEventsAndGate(
      misconfigured,
      (step) => step.event.type === "ignition.mcs_served" && step.event.pool === "master",
      (step) => {
        if (step.event.type !== "ignition.mcs_served") return [step];
        return [
          {
            kind: "event",
            event: {
              t: step.event.t,
              type: "ignition.failed",
              node: step.event.from,
              reason: "connection refused fetching machine config via api-int:22623",
            },
          },
        ];
      },
      {
        kind: "gate",
        gateId: "fix-22623-backend",
        prompt: "Masters can resolve api-int, but the 22623 (Machine Config Server) backend is down.",
        hint: "Run `lab lb set 22623 bootstrap up` to restore the backend.",
        check: (s) => s.lb[22623]?.bootstrap === "up",
      }
    );
  },
};
