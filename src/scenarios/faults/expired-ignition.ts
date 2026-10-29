import type { FaultSpec } from "../../engine/scenario";
import { replaceEventsAndGate } from "./shared";

export const expiredIgnition: FaultSpec = {
  id: "expired-ignition",
  rewrite: (steps) =>
    replaceEventsAndGate(
      steps,
      (step) => step.event.type === "ignition.fetched" && step.event.node === "bootstrap",
      (step) => {
        if (step.event.type !== "ignition.fetched") return [step];
        return [
          {
            kind: "event",
            event: {
              t: step.event.t,
              type: "ignition.failed",
              node: "bootstrap",
              reason: "x509: certificate has expired or is not yet valid",
            },
          },
        ];
      },
      {
        kind: "gate",
        gateId: "fix-expired-ignition",
        prompt: "Bootstrap's ignition config is more than 24 hours old — its embedded certificates have expired.",
        hint: "Run `lab ignition regenerate` in the terminal.",
        check: (s) => s.nodes.bootstrap?.phase !== "failed",
      }
    ),
};
