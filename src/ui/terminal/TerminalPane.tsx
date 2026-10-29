import { Terminal } from "@xterm/xterm";
import "@xterm/xterm/css/xterm.css";
import { useEffect, useRef } from "react";
import type { InstallEvent } from "../../engine/events";
import type { ClusterSnapshot } from "../../engine/snapshot";
import { runLine } from "../../terminal/registry";

const PROMPT = "\r\n$ ";

export interface TerminalPaneProps {
  snapshot: ClusterSnapshot;
  onDispatch: (events: InstallEvent[]) => void;
}

export function TerminalPane({ snapshot, onDispatch }: TerminalPaneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<Terminal>();
  const snapshotRef = useRef(snapshot);
  const dispatchRef = useRef(onDispatch);
  snapshotRef.current = snapshot;
  dispatchRef.current = onDispatch;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const term = new Terminal({
      convertEol: true,
      fontSize: 13,
      theme: { background: "#0f172a" },
    });
    term.open(container);
    terminalRef.current = term;

    term.writeln("OpenShift Install Lab terminal. Type `help` for a list of commands.");
    term.write(PROMPT);

    let line = "";
    const disposable = term.onKey(({ key, domEvent }) => {
      if (domEvent.key === "Enter") {
        const result = runLine(line, snapshotRef.current);
        if (result.output) term.write(`\r\n${result.output}`);
        if (result.dispatch) dispatchRef.current(result.dispatch);
        line = "";
        term.write(PROMPT);
        return;
      }
      if (domEvent.key === "Backspace") {
        if (line.length > 0) {
          line = line.slice(0, -1);
          term.write("\b \b");
        }
        return;
      }
      if (key.length === 1) {
        line += key;
        term.write(key);
      }
    });

    return () => {
      disposable.dispose();
      term.dispose();
    };
  }, []);

  return <div ref={containerRef} className="h-full w-full bg-[#0f172a] p-2" />;
}
