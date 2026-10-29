import { describe, expect, it } from "vitest";
import { createInitialSnapshot } from "../../../src/engine/snapshot";
import { lab } from "../../../src/terminal/commands/lab";

const snapshot = createInitialSnapshot({ t: 42 });

describe("lab dns", () => {
  it("add dispatches a learner.action followed by a dns.record add event", () => {
    const result = lab(["dns", "add", "api-int.demo.lab.example.com", "192.168.1.10"], snapshot);
    expect(result.dispatch).toEqual([
      {
        t: 42,
        type: "learner.action",
        action: "lab.dns.add",
        payload: { name: "api-int.demo.lab.example.com", ip: "192.168.1.10" },
      },
      {
        t: 42,
        type: "dns.record",
        name: "api-int.demo.lab.example.com",
        ip: "192.168.1.10",
        action: "add",
      },
    ]);
    expect(result.output).toContain("[lab]");
  });

  it("rm dispatches a learner.action followed by a dns.record remove event", () => {
    const result = lab(["dns", "rm", "api-int.demo.lab.example.com"], snapshot);
    expect(result.dispatch).toEqual([
      {
        t: 42,
        type: "learner.action",
        action: "lab.dns.rm",
        payload: { name: "api-int.demo.lab.example.com" },
      },
      { t: 42, type: "dns.record", name: "api-int.demo.lab.example.com", action: "remove" },
    ]);
  });

  it("errors without dispatching on missing args", () => {
    const result = lab(["dns", "add", "name-only"], snapshot);
    expect(result.dispatch).toBeUndefined();
    expect(result.output).toMatch(/usage/i);
  });
});

describe("lab lb", () => {
  it("set dispatches a learner.action followed by an lb.backend event with the given state", () => {
    const result = lab(["lb", "set", "22623", "master-0", "up"], snapshot);
    expect(result.dispatch).toEqual([
      {
        t: 42,
        type: "learner.action",
        action: "lab.lb.set",
        payload: { frontend: 22623, backend: "master-0", state: "up" },
      },
      { t: 42, type: "lb.backend", frontend: 22623, backend: "master-0", state: "up" },
    ]);
  });

  it("rm dispatches a learner.action followed by an lb.backend event with state removed", () => {
    const result = lab(["lb", "rm", "22623", "bootstrap"], snapshot);
    expect(result.dispatch).toEqual([
      {
        t: 42,
        type: "learner.action",
        action: "lab.lb.rm",
        payload: { frontend: 22623, backend: "bootstrap", state: "removed" },
      },
      { t: 42, type: "lb.backend", frontend: 22623, backend: "bootstrap", state: "removed" },
    ]);
  });

  it("errors without dispatching for an unknown frontend port", () => {
    const result = lab(["lb", "set", "9999", "master-0", "up"], snapshot);
    expect(result.dispatch).toBeUndefined();
    expect(result.output).toMatch(/unknown|invalid/i);
  });

  it("errors without dispatching for an invalid state", () => {
    const result = lab(["lb", "set", "22623", "master-0", "sideways"], snapshot);
    expect(result.dispatch).toBeUndefined();
    expect(result.output).toMatch(/unknown|invalid/i);
  });
});

describe("lab ignition", () => {
  it("regenerate dispatches a learner.action followed by a successful ignition.fetched for bootstrap by default", () => {
    const result = lab(["ignition", "regenerate"], snapshot);
    expect(result.dispatch).toEqual([
      { t: 42, type: "learner.action", action: "lab.ignition.regenerate", payload: { node: "bootstrap" } },
      { t: 42, type: "ignition.fetched", node: "bootstrap", file: "bootstrap.ign", from: "helper" },
    ]);
    expect(result.output).toContain("[lab]");
  });

  it("regenerate accepts an explicit node", () => {
    const result = lab(["ignition", "regenerate", "master-0"], snapshot);
    expect(result.dispatch).toEqual([
      { t: 42, type: "learner.action", action: "lab.ignition.regenerate", payload: { node: "master-0" } },
      { t: 42, type: "ignition.fetched", node: "master-0", file: "bootstrap.ign", from: "helper" },
    ]);
  });

  it("errors without dispatching for an unknown ignition subcommand", () => {
    const result = lab(["ignition", "whatever"], snapshot);
    expect(result.dispatch).toBeUndefined();
    expect(result.output).toMatch(/usage/i);
  });
});

describe("lab unknown subcommand", () => {
  it("prints a friendly error", () => {
    const result = lab(["wat"], snapshot);
    expect(result.output).toMatch(/unknown/i);
  });

  it("shows usage (not an error) when called with no arguments", () => {
    const result = lab([], snapshot);
    expect(result.output).toContain("lab dns add");
    expect(result.output).not.toMatch(/unknown/i);
  });
});
