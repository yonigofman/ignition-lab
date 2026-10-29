import { useEffect, useMemo, useRef, useState } from "react";
import { Clock } from "../engine/clock";
import { maxEventTime, type InstallEvent } from "../engine/events";
import type { Scenario } from "../engine/scenario";
import { SimulatorSource } from "../engine/sources/SimulatorSource";
import type { ClusterSnapshot } from "../engine/snapshot";

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
}

export function useSimulation(scenario: Scenario): Simulation {
  const events = useMemo(() => new SimulatorSource(scenario).getEvents(), [scenario]);
  const durationT = useMemo(() => maxEventTime(events), [events]);
  const clockRef = useRef<{ events: InstallEvent[]; clock: Clock }>();
  if (!clockRef.current || clockRef.current.events !== events) {
    clockRef.current = { events, clock: new Clock(events) };
  }
  const clock = clockRef.current.clock;

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
  };
}
