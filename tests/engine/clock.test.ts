import { describe, expect, it } from "vitest";
import { Clock } from "../../src/engine/clock";
import type { InstallEvent } from "../../src/engine/events";

const events: InstallEvent[] = [
  { t: 0, type: "vm.power", node: "bootstrap", state: "on" },
  { t: 10, type: "node.ready", node: "bootstrap", ready: true },
];

describe("Clock", () => {
  it("starts paused at t=0", () => {
    const clock = new Clock(events);
    expect(clock.time).toBe(0);
    expect(clock.isPlaying).toBe(false);
  });

  it("does not advance time while paused", () => {
    const clock = new Clock(events);
    clock.tick(5);
    expect(clock.time).toBe(0);
  });

  it("advances time by delta * speed while playing", () => {
    const clock = new Clock(events);
    clock.play();
    clock.tick(5);
    expect(clock.time).toBe(5);
    clock.setSpeed(2);
    clock.tick(5);
    expect(clock.time).toBe(15);
  });

  it("pause stops further advancement", () => {
    const clock = new Clock(events);
    clock.play();
    clock.tick(5);
    clock.pause();
    clock.tick(5);
    expect(clock.time).toBe(5);
  });

  it("seek jumps to a time regardless of play state", () => {
    const paused = new Clock(events);
    paused.seek(10);
    expect(paused.time).toBe(10);

    const playing = new Clock(events);
    playing.play();
    playing.seek(10);
    expect(playing.time).toBe(10);
  });

  it("seek clamps negative times to 0", () => {
    const clock = new Clock(events);
    clock.seek(-5);
    expect(clock.time).toBe(0);
  });

  it("getSnapshot at the current time matches reduceAll for that time", () => {
    const clock = new Clock(events);
    clock.seek(10);
    expect(clock.getSnapshot().nodes.bootstrap).toMatchObject({ power: "on", ready: true });

    clock.seek(5);
    expect(clock.getSnapshot().nodes.bootstrap).toMatchObject({ power: "on", ready: false });
  });

  it("setSpeed rejects non-positive speeds", () => {
    const clock = new Clock(events);
    expect(() => clock.setSpeed(0)).toThrow();
    expect(() => clock.setSpeed(-1)).toThrow();
  });
});
