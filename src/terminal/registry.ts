import type { ClusterSnapshot } from "../engine/snapshot";
import { closestMatch } from "./closestMatch";
import { clear } from "./commands/clear";
import { curl } from "./commands/curl";
import { dig } from "./commands/dig";
import { help } from "./commands/help";
import { journalctl } from "./commands/journalctl";
import { lab } from "./commands/lab";
import { oc } from "./commands/oc";
import { openshiftInstall } from "./commands/openshift-install";
import { ssh } from "./commands/ssh";
import { parseLine } from "./parseLine";
import type { CommandResult, RegisteredCommand } from "./types";

export const registry: Record<string, RegisteredCommand> = {
  oc: {
    description: "Interact with the simulated cluster (get nodes|csr|co|clusterversion, adm certificate approve)",
    usage: [
      "oc get nodes                        List Node objects (only registered masters/workers)",
      "oc get csr                          List CertificateSigningRequests",
      "oc get co                           List ClusterOperators",
      "oc get clusterversion               Show the cluster's overall install status",
      "oc adm certificate approve <name>   Approve a pending CSR",
    ].join("\n"),
    run: oc,
  },
  clear: {
    description: "Clear the terminal screen",
    usage: "clear   Clear the terminal screen",
    run: clear,
  },
  dig: {
    description: "Query a DNS name",
    usage: "dig <name>   Query a DNS name against the simulated zone (supports *.apps wildcard records)",
    run: dig,
  },
  curl: {
    description: "Make an HTTP request against a simulated endpoint",
    usage:
      "curl [-k] <url>   Make an HTTP request; fails if the host doesn't resolve or the load balancer has no live backend on that port",
    run: curl,
  },
  "openshift-install": {
    description: "Installer wait-for checks (wait-for bootstrap-complete|install-complete)",
    usage: [
      "openshift-install wait-for bootstrap-complete [--log-level=info]   Report whether bootstrap has finished",
      "openshift-install wait-for install-complete                        Report whether the install has finished",
    ].join("\n"),
    run: openshiftInstall,
  },
  ssh: {
    description: "Connect to a cluster machine",
    usage: "ssh <user@host>   Connect to a cluster machine (cosmetic banner; no persistent session)",
    run: ssh,
  },
  journalctl: {
    description: "View bootstrap service logs",
    usage: "journalctl [-u <unit> ...]   Show bootstrap-related log lines up to the current time",
    run: journalctl,
  },
  lab: {
    description: "[lab] simulator-only helpers to fix DNS/LB/ignition, not a real tool (dns add|rm, lb set|rm, ignition regenerate)",
    usage: [
      "[lab] lab dns add <name> <ip>                      Add a DNS record",
      "[lab] lab dns rm <name>                             Remove a DNS record",
      "[lab] lab lb set <frontend> <backend> <state>       Set a load balancer backend's state (up|down|removed)",
      "[lab] lab lb rm <frontend> <backend>                Remove a load balancer backend",
      "[lab] lab ignition regenerate [node]                 Regenerate ignition configs for a node (default: bootstrap)",
    ].join("\n"),
    run: lab,
  },
  help: {
    description: "List available commands",
    usage: "help [command]   List all commands, or show detailed usage for one command",
    run: help,
  },
};

let lessonCommands: string[] | null = null;

export function setLessonCommands(names: string[] | null): void {
  lessonCommands = names;
}

export function getLessonCommands(): string[] | null {
  return lessonCommands;
}

export function runLine(line: string, snapshot: ClusterSnapshot): CommandResult {
  const [name, ...args] = parseLine(line);
  if (!name) {
    return { output: "" };
  }

  const command = registry[name];
  if (!command) {
    const suggestion = closestMatch(name, Object.keys(registry));
    return {
      output: suggestion
        ? `command not found: ${name}. Did you mean "${suggestion}"?`
        : `command not found: ${name}`,
    };
  }

  if (args[0] === "--help" || args[0] === "-h" || args[0] === "help") {
    return { output: command.usage };
  }

  return command.run(args, snapshot);
}
