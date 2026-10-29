import type { ClusterSnapshot } from "../../engine/snapshot";
import type { Command, CommandResult } from "../types";

const BOOTSTRAP_DONE_PHASES: ClusterSnapshot["phase"][] = ["bootstrap-complete", "converging", "complete"];

function waitForBootstrapComplete(snapshot: ClusterSnapshot): CommandResult {
  if (BOOTSTRAP_DONE_PHASES.includes(snapshot.phase)) {
    return {
      output: [
        "INFO API v1.29.4 up",
        "INFO Waiting up to 30m0s (until 12:00AM) for bootstrapping to complete...",
        "INFO It is now safe to remove the bootstrap resources",
      ].join("\n"),
    };
  }
  return {
    output: `INFO Waiting up to 30m0s for bootstrapping to complete... (current phase: ${snapshot.phase})`,
  };
}

function waitForInstallComplete(snapshot: ClusterSnapshot): CommandResult {
  if (snapshot.phase === "complete") {
    return {
      output: ["INFO Install complete!", "INFO Access the OpenShift web-console here"].join("\n"),
    };
  }
  return {
    output: `INFO Waiting up to 40m0s for the cluster to initialize... (current phase: ${snapshot.phase})`,
  };
}

function waitFor(args: string[], snapshot: ClusterSnapshot): CommandResult {
  switch (args[0]) {
    case "bootstrap-complete":
      return waitForBootstrapComplete(snapshot);
    case "install-complete":
      return waitForInstallComplete(snapshot);
    default:
      return { output: `error: unknown wait-for target "${args[0] ?? ""}" (not supported by this simulator)` };
  }
}

export const openshiftInstall: Command = (args, snapshot) => {
  if (args[0] === "wait-for") {
    return waitFor(args.slice(1), snapshot);
  }
  return { output: `error: unknown command "openshift-install ${args.join(" ")}" (not supported by this simulator)` };
};
