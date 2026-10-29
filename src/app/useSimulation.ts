import { useEffect, useMemo, useRef, useState } from "react";
import { Clock } from "../engine/clock";
import { maxEventTime, type InstallEvent } from "../engine/events";
import type { Scenario } from "../engine/scenario";
import { SimulatorSource } from "../engine/sources/SimulatorSource";
import { createInitialSnapshot, type ClusterSnapshot } from "../engine/snapshot";

export interface Simulation {
  scenario: Scenario;
  events: InstallEvent[];
  snapshot: ClusterSnapshot;
  currentT: number;
  durationT: number;
  isPlaying: boolean;
  speed: number;
  play: () => void;
  pause: () => void;
  setSpeed: (speed: number) => void;
  seek: (t: number) => void;
  dispatch: (events: InstallEvent[]) => void;
}

export function useSimulation(scenario: Scenario): Simulation {
  const baseEvents = useMemo(() => new SimulatorSource(scenario).getEvents(), [scenario]);
  const [dispatchedEvents, setDispatchedEvents] = useState<InstallEvent[]>([]);
  const events = useMemo(() => [...baseEvents, ...dispatchedEvents], [baseEvents, dispatchedEvents]);
  const durationT = useMemo(() => maxEventTime(events), [events]);

  const clockRef = useRef<{ baseEvents: InstallEvent[]; clock: Clock }>();
  // Keyed on baseEvents (scenario), not events (scenario + dispatched): only a scenario
  // change should reset play/pause/speed/time; dispatched events just sync via setEvents below.
  if (!clockRef.current || clockRef.current.baseEvents !== baseEvents) {
    clockRef.current = { baseEvents, clock: new Clock(events, createInitialSnapshot(scenario.initialState)) };
  }
  const clock = clockRef.current.clock;
  clock.setEvents(events);

  const [, forceRender] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeedState] = useState(1);

  useEffect(() => {
    if (!isPlaying) return;
    let lastTimestamp: number | null = null;
    let frame: number;

    const tick = (timestamp: number) => {
      if (lastTimestamp !== null) {
        clock.tick((timestamp - lastTimestamp) / 1000);
        if (clock.time >= durationT) {
          clock.pause();
          clock.seek(durationT);
          setIsPlaying(false);
        }
        forceRender((n) => n + 1);
      }
      lastTimestamp = timestamp;
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [isPlaying, clock, durationT]);

  return {
    scenario,
    events,
    snapshot: clock.getSnapshot(),
    currentT: clock.time,
    durationT,
    isPlaying,
    speed,
    play: () => {
      clock.play();
      setIsPlaying(true);
    },
    pause: () => {
      clock.pause();
      setIsPlaying(false);
    },
    setSpeed: (next: number) => {
      clock.setSpeed(next);
      setSpeedState(next);
    },
    seek: (t: number) => {
      clock.seek(t);
      forceRender((n) => n + 1);
    },
    dispatch: (newEvents: InstallEvent[]) => {
      if (newEvents.length === 0) return;
      setDispatchedEvents((prev) => [...prev, ...newEvents]);
    },
  };
}
