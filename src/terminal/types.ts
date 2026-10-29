import type { InstallEvent } from "../engine/events";
import type { ClusterSnapshot } from "../engine/snapshot";

export interface CommandResult {
  output: string;
  dispatch?: InstallEvent[];
  clearScreen?: boolean;
}

export type Command = (args: string[], snapshot: ClusterSnapshot) => CommandResult;

export interface RegisteredCommand {
  description: string;
  usage: string;
  run: Command;
}
