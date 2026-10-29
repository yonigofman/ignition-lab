import type { InstallEvent } from "../events";

export interface EventSource {
  getEvents(): InstallEvent[];
  dispatch(event: InstallEvent): void;
}
