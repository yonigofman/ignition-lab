import type { FaultSpec } from "../../engine/scenario";
import { stripPredicts } from "./shared";

/**
 * The only fault with no gate: the learner never removes bootstrap from the
 * LB, so the install completes normally but `lb[6443]`/`lb[22623]`'s
 * `bootstrap` backend is still "up" at the end — a dangling, non-blocking
 * symptom to notice and clean up (`lab lb rm`), not something forcing a stop.
 */
export const bootstrapLeftInLb: FaultSpec = {
  id: "bootstrap-left-in-lb",
  rewrite: (steps) =>
    stripPredicts(steps).filter((step) => !(step.kind === "gate" && step.gateId === "remove-bootstrap-from-lb")),
};
