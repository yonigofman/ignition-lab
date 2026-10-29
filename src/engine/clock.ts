import type { InstallEvent } from "./events";
import { reduceAll } from "./reducer";
import { createInitialSnapshot, type ClusterSnapshot } from "./snapshot";

export class Clock {
  private t = 0;
  private speed = 1;
  private playing = false;

  private events: InstallEvent[];
  private readonly initialSnapshot: ClusterSnapshot;

  constructor(events: InstallEvent[], initialSnapshot: ClusterSnapshot = createInitialSnapshot()) {
    this.events = events;
    this.initialSnapshot = initialSnapshot;
  }

  setEvents(events: InstallEvent[]): void {
    this.events = events;
  }

  play(): void {
    this.playing = true;
  }

  pause(): void {
    this.playing = false;
  }

  setSpeed(speed: number): void {
    if (speed <= 0) throw new Error("speed must be positive");
    this.speed = speed;
  }

  seek(t: number): void {
    this.t = Math.max(0, t);
  }

  tick(deltaSeconds: number): void {
    if (!this.playing) return;
    this.t = Math.max(0, this.t + deltaSeconds * this.speed);
  }

  get time(): number {
    return this.t;
  }

  get isPlaying(): boolean {
    return this.playing;
  }

  getSnapshot(): ClusterSnapshot {
    return reduceAll(this.events, this.t, this.initialSnapshot);
  }
}
