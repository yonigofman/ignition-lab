import type { ClusterSnapshot } from "../engine/snapshot";
import { closestMatch } from "./closestMatch";
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
    run: oc,
  },
  dig: { description: "Query a DNS name", run: dig },
  curl: { description: "Make an HTTP request against a simulated endpoint", run: curl },
  "openshift-install": { description: "Installer wait-for checks (wait-for bootstrap-complete|install-complete)", run: openshiftInstall },
  ssh: { description: "Connect to a cluster machine", run: ssh },
  journalctl: { description: "View bootstrap service logs", run: journalctl },
  lab: { description: "[lab] simulator-only helpers to fix DNS/LB, not a real tool (dns add|rm, lb set|rm)", run: lab },
  help: { description: "List available commands", run: help },
};

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

  return command.run(args, snapshot);
}
