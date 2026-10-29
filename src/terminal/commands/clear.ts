import type { Command } from "../types";

export const clear: Command = () => ({ output: "", clearScreen: true });
