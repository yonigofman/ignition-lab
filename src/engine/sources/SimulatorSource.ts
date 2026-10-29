import type { InstallEvent } from "../events";
import { reduceAll } from "../reducer";
import type { Scenario, ScenarioStep } from "../scenario";
import { createInitialSnapshot } from "../snapshot";
import type { EventSource } from "./EventSource";

export interface SimulatorSourceState {
  events: InstallEvent[];
  blockingStep: ScenarioStep | null;
}

type Walk = SimulatorSourceState;

export class SimulatorSource implements EventSource {
  private readonly dispatched: InstallEvent[] = [];
  private readonly acknowledged = new Set<number>();

  constructor(private readonly scenario: Scenario) {}

  acknowledge(stepIndex: number): void {
    this.acknowledged.add(stepIndex);
  }

  dispatch(event: InstallEvent): void {
    this.dispatched.push(event);
  }

  private walk(): Walk {
    const emitted: InstallEvent[] = [];

    for (let i = 0; i < this.scenario.steps.length; i++) {
      const step = this.scenario.steps[i];
      if (!step) continue;

      if (step.kind === "event") {
        emitted.push(step.event);
        continue;
      }

      if (step.kind === "gate") {
        const snapshot = reduceAll(
          [...emitted, ...this.dispatched],
          Infinity,
          createInitialSnapshot(this.scenario.initialState)
        );
        if (!step.check(snapshot)) {
          return { events: [...emitted, ...this.dispatched], blockingStep: step };
        }
        continue;
      }

      if (step.kind === "predict") {
        if (!this.acknowledged.has(i)) {
          return { events: [...emitted, ...this.dispatched], blockingStep: step };
        }
        continue;
      }

      // step.kind === "chapter": passthrough marker, no effect on event emission
    }

    return { events: [...emitted, ...this.dispatched], blockingStep: null };
  }

  getState(): SimulatorSourceState {
    return this.walk();
  }

  getEvents(): InstallEvent[] {
    return this.walk().events;
  }

  getBlockingStep(): ScenarioStep | null {
    return this.walk().blockingStep;
  }
}
