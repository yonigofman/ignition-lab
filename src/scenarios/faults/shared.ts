import type { ScenarioStep } from "../../engine/scenario";

/**
 * Predict steps are a lesson-authoring device (M4); fault variants aren't
 * paired with matching lesson narration yet (that's module 7, out of scope
 * for M5), and several faults make a predict's premise false anyway. Every
 * fault strips them so exploring a fault via the scenario picker never
 * blocks on an orphaned, unanswerable prediction.
 */
export function stripPredicts(steps: ScenarioStep[]): ScenarioStep[] {
  return steps.filter((step) => step.kind !== "predict");
}

type EventStep = ScenarioStep & { kind: "event" };
type GateStep = ScenarioStep & { kind: "gate" };

/**
 * The shared shape behind most faults: find every step matching `matches`,
 * replace each with the symptom step(s) `makeSymptom` produces, then insert
 * one `gate` step right after the last replacement. Everything else in the
 * scenario (including everything after the gate) is left untouched.
 */
export function replaceEventsAndGate(
  steps: ScenarioStep[],
  matches: (step: EventStep) => boolean,
  makeSymptom: (step: EventStep) => ScenarioStep[],
  gate: GateStep
): ScenarioStep[] {
  const out: ScenarioStep[] = [];
  let lastSymptomIndex = -1;

  for (const step of stripPredicts(steps)) {
    if (step.kind === "event" && matches(step)) {
      out.push(...makeSymptom(step));
      lastSymptomIndex = out.length - 1;
      continue;
    }
    out.push(step);
  }

  if (lastSymptomIndex === -1) {
    throw new Error(`replaceEventsAndGate: no step matched for gate "${gate.gateId}"`);
  }

  out.splice(lastSymptomIndex + 1, 0, gate);
  return out;
}
