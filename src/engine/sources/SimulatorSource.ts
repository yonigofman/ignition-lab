import type { InstallEvent } from "../events";
import { reduceAll } from "../reducer";
import type { Scenario } from "../scenario";
import type { EventSource } from "./EventSource";

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

  getEvents(): InstallEvent[] {
    const emitted: InstallEvent[] = [];

    for (let i = 0; i < this.scenario.steps.length; i++) {
      const step = this.scenario.steps[i];
      if (!step) continue;

      if (step.kind === "event") {
        emitted.push(step.event);
        continue;
      }

      if (step.kind === "gate") {
        const snapshot = reduceAll([...emitted, ...this.dispatched], Infinity);
        if (!step.check(snapshot)) {
          return [...emitted, ...this.dispatched];
        }
        continue;
      }

      if (step.kind === "predict") {
        if (!this.acknowledged.has(i)) {
          return [...emitted, ...this.dispatched];
        }
        continue;
      }

      // step.kind === "chapter": passthrough marker, no effect on event emission
    }

    return [...emitted, ...this.dispatched];
  }
}
