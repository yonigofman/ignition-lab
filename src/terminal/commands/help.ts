import { closestMatch } from "../closestMatch";
import { getLessonCommands, registry } from "../registry";
import type { Command } from "../types";

const ALWAYS_LISTED = new Set(["help", "clear"]);

export const help: Command = (args) => {
  const target = args[0];

  if (!target) {
    const lessonCommands = getLessonCommands();
    const names = Object.keys(registry)
      .filter((n) => !lessonCommands || lessonCommands.includes(n) || ALWAYS_LISTED.has(n))
      .sort();
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
