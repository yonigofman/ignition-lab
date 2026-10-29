import { closestMatch } from "../closestMatch";
import { registry } from "../registry";
import type { Command } from "../types";

export const help: Command = (args) => {
  const target = args[0];

  if (!target) {
    const names = Object.keys(registry).sort();
    const width = Math.max(...names.map((n) => n.length));
    return {
      output: names.map((n) => `${n.padEnd(width)}  ${registry[n]?.description ?? ""}`).join("\n"),
    };
  }

  const command = registry[target];
  if (!command) {
    const suggestion = closestMatch(target, Object.keys(registry));
    return {
      output: suggestion
        ? `no help for "${target}". Did you mean "${suggestion}"?`
        : `no help for "${target}"`,
    };
  }

  return { output: command.usage };
};
