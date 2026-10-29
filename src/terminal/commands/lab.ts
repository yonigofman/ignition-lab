import type { InstallEvent } from "../../engine/events";
import { LB_FRONTENDS, type ClusterSnapshot, type LbBackendState } from "../../engine/snapshot";
import { registry } from "../registry";
import type { Command, CommandResult } from "../types";

const KNOWN_STATES: LbBackendState[] = ["up", "down", "removed"];

function learnerAction(t: number, action: string, payload: unknown): InstallEvent {
  return { t, type: "learner.action", action, payload };
}

function dns(args: string[], snapshot: ClusterSnapshot): CommandResult {
  const [sub, name, ip] = args;
  if (sub === "add") {
    if (!name || !ip) return { output: "usage: lab dns add <name> <ip>" };
    const event: InstallEvent = { t: snapshot.t, type: "dns.record", name, ip, action: "add" };
    return {
      output: `[lab] dns record added: ${name} -> ${ip}`,
      dispatch: [learnerAction(snapshot.t, "lab.dns.add", { name, ip }), event],
    };
  }
  if (sub === "rm") {
    if (!name) return { output: "usage: lab dns rm <name>" };
    const event: InstallEvent = { t: snapshot.t, type: "dns.record", name, action: "remove" };
    return {
      output: `[lab] dns record removed: ${name}`,
      dispatch: [learnerAction(snapshot.t, "lab.dns.rm", { name }), event],
    };
  }
  return { output: "usage: lab dns add <name> <ip> | lab dns rm <name>" };
}

function lb(args: string[], snapshot: ClusterSnapshot): CommandResult {
  const sub = args[0];

  if (sub === "set" || sub === "rm") {
    const frontendArg = args[1];
    const backend = args[2];
    const stateArg = sub === "rm" ? "removed" : args[3];

    const frontend = LB_FRONTENDS.find((f) => String(f) === frontendArg);
    if (!frontend) {
      return { output: `[lab] unknown frontend port "${frontendArg ?? ""}" (expected one of ${LB_FRONTENDS.join(", ")})` };
    }
    if (!backend) {
      return { output: "usage: lab lb set <frontend> <backend> <state> | lab lb rm <frontend> <backend>" };
    }
    const state = KNOWN_STATES.find((s) => s === stateArg);
    if (!state) {
      return { output: `[lab] invalid backend state "${stateArg ?? ""}" (expected one of ${KNOWN_STATES.join(", ")})` };
    }

    const event: InstallEvent = { t: snapshot.t, type: "lb.backend", frontend, backend, state };
    return {
      output: `[lab] lb:${frontend} backend ${backend} set to ${state}`,
      dispatch: [learnerAction(snapshot.t, `lab.lb.${sub}`, { frontend, backend, state }), event],
    };
  }

  return { output: "usage: lab lb set <frontend> <backend> <state> | lab lb rm <frontend> <backend>" };
}

export const lab: Command = (args, snapshot) => {
  switch (args[0]) {
    case "dns":
      return dns(args.slice(1), snapshot);
    case "lb":
      return lb(args.slice(1), snapshot);
    case undefined:
      return { output: registry.lab?.usage ?? "" };
    default:
      return { output: `[lab] unknown command "lab ${args.join(" ")}"\n\n${registry.lab?.usage ?? ""}` };
  }
};
