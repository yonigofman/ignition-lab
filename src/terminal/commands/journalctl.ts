import type { Command } from "../types";

export const journalctl: Command = (_args, snapshot) => {
  const lines = snapshot.log.filter((line) => line.includes("bootstrap"));
  if (lines.length === 0) {
    return { output: "-- No entries --" };
  }
  return { output: lines.join("\n") };
};
