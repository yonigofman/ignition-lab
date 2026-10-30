import { useEffect, useRef } from "react";
import type { Simulation } from "./useSimulation";

export interface DemoMode {
  enterDemoMode: () => void;
  exitDemoMode: () => void;
}

/**
 * Drives the "watch it play" demo: autoplays on entry, and - since there's no
 * one at the terminal to clear a gate or pick a predict answer - resolves
 * either itself as soon as it's reached (predicts generically via acknowledge();
 * gates via whatever events the scenario's own `autoResolve` describes, so this
 * hook carries no scenario-specific knowledge of its own).
 */
export function useDemoMode(
  sim: Simulation,
  demoMode: boolean,
  setDemoMode: (on: boolean) => void,
  scenarioIndex: number,
  setScenarioIndex: (index: number) => void,
  onEnter: () => void
): DemoMode {
  const preDemoScenarioIndexRef = useRef(scenarioIndex);
  const demoStartedRef = useRef(false);

  useEffect(() => {
    if (!demoMode) {
      demoStartedRef.current = false;
      return;
    }
    if (!demoStartedRef.current) {
      demoStartedRef.current = true;
      sim.play();
    }
    if (sim.blockingStep?.kind === "predict") {
      const index = sim.scenario.steps.indexOf(sim.blockingStep);
      if (index >= 0) sim.acknowledge(index);
    } else if (sim.blockingStep?.kind === "gate" && sim.blockingStep.autoResolve) {
      sim.dispatch(sim.blockingStep.autoResolve(sim.currentT));
    }
    // react-hooks/exhaustive-deps isn't linted for plain .ts files in this repo (see eslint.config.js) -
    // deliberately re-running on [demoMode, sim.blockingStep] only, not every sim.* identity change.
  }, [demoMode, sim.blockingStep]);

  return {
    enterDemoMode: () => {
      preDemoScenarioIndexRef.current = scenarioIndex;
      onEnter();
      setDemoMode(true);
    },
    exitDemoMode: () => {
      setDemoMode(false);
      setScenarioIndex(preDemoScenarioIndexRef.current);
    },
  };
}
