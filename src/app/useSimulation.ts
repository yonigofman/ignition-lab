import { useEffect, useRef, useState } from "react";
import { Clock } from "../engine/clock";
import { maxEventTime, type InstallEvent } from "../engine/events";
import { scenarioDuration, type Scenario, type ScenarioStep } from "../engine/scenario";
import { SimulatorSource } from "../engine/sources/SimulatorSource";
import { createInitialSnapshot, type ClusterSnapshot } from "../engine/snapshot";

export interface Simulation {
  scenario: Scenario;
  events: InstallEvent[];
  blockingStep: ScenarioStep | null;
  snapshot: ClusterSnapshot;
  currentT: number;
  durationT: number;
  availableDurationT: number;
  isPlaying: boolean;
  speed: number;
  play: () => void;
  pause: () => void;
  setSpeed: (speed: number) => void;
  seek: (t: number) => void;
  dispatch: (events: InstallEvent[]) => void;
  acknowledge: (stepIndex: number) => void;
}

export function useSimulation(scenario: Scenario): Simulation {
  const stateRef = useRef<{ scenario: Scenario; source: SimulatorSource; clock: Clock }>();
  if (!stateRef.current || stateRef.current.scenario !== scenario) {
    const source = new SimulatorSource(scenario);
    stateRef.current = {
      scenario,
      source,
      clock: new Clock(source.getEvents(), createInitialSnapshot(scenario.initialState)),
    };
  }
  const { source, clock } = stateRef.current;

  const { events, blockingStep } = source.getState();
  clock.setEvents(events);

  const durationT = scenarioDuration(scenario);
  const availableDurationT = maxEventTime(events);

  const [, forceRender] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeedState] = useState(1);
  // True once the clock has auto-paused because it ran out of currently-available
  // (possibly gate-truncated) events, as opposed to the user clicking Pause. Only in
  // that state does clearing the block (via dispatch) resume playback on its own.
  const stalledAtBoundaryRef = useRef(false);

  useEffect(() => {
    if (!isPlaying) return;
    let lastTimestamp: number | null = null;
    let frame: number;

    const tick = (timestamp: number) => {
      if (lastTimestamp !== null) {
        clock.tick((timestamp - lastTimestamp) / 1000);
        if (clock.time >= availableDurationT) {
          clock.pause();
          clock.seek(availableDurationT);
          setIsPlaying(false);
          stalledAtBoundaryRef.current = true;
        }
        forceRender((n) => n + 1);
      }
      lastTimestamp = timestamp;
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [isPlaying, clock, availableDurationT]);

  return {
    scenario,
    events,
    blockingStep,
    snapshot: clock.getSnapshot(),
    currentT: clock.time,
    durationT,
    availableDurationT,
    isPlaying,
    speed,
    play: () => {
      stalledAtBoundaryRef.current = false;
      clock.play();
      setIsPlaying(true);
    },
    pause: () => {
      stalledAtBoundaryRef.current = false;
      clock.pause();
      setIsPlaying(false);
    },
    setSpeed: (next: number) => {
      clock.setSpeed(next);
      setSpeedState(next);
    },
    seek: (t: number) => {
      stalledAtBoundaryRef.current = false;
      clock.seek(t);
      forceRender((n) => n + 1);
    },
    dispatch: (newEvents: InstallEvent[]) => {
      if (newEvents.length === 0) return;
      const before = source.getBlockingStep();
      for (const event of newEvents) source.dispatch(event);
      const after = source.getBlockingStep();

      // Resume whenever the blocker changed - cleared entirely, or moved on to
      // a later gate/predict further down the scenario (a scenario can have
      // several gates in sequence; clearing one just reveals the next, so
      // "no longer blocked at all" is too strict a condition to resume on).
      if (stalledAtBoundaryRef.current && before !== null && before !== after) {
        stalledAtBoundaryRef.current = false;
        clock.play();
        setIsPlaying(true);
      }
      forceRender((n) => n + 1);
    },
    acknowledge: (stepIndex: number) => {
      source.acknowledge(stepIndex);
      forceRender((n) => n + 1);
    },
  };
}
