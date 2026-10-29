import type { Command } from "../types";
import { registry } from "../registry";

export const help: Command = () => {
  const names = Object.keys(registry).sort();
  const width = Math.max(...names.map((n) => n.length));
  return {
    output: names.map((n) => `${n.padEnd(width)}  ${registry[n]?.description ?? ""}`).join("\n"),
  };
};
