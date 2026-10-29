import type { Command } from "../types";

export const ssh: Command = (args) => {
  const target = args[0];
  if (!target) {
    return { output: "usage: ssh <user@host>" };
  }
  const host = target.includes("@") ? target.split("@")[1] : target;
  return { output: `Connected to ${host}.\nLast login: just now from the helper node.` };
};
