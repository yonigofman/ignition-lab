import { FitAddon } from "@xterm/addon-fit";
import { Terminal, type ITheme } from "@xterm/xterm";
import "@xterm/xterm/css/xterm.css";
import { useEffect, useRef } from "react";
import type { Theme } from "../../app/useTheme";
import type { InstallEvent } from "../../engine/events";
import type { ClusterSnapshot } from "../../engine/snapshot";
import { runLine } from "../../terminal/registry";

const PROMPT = "\r\n$ ";

const THEME: Record<Theme, ITheme> = {
  dark: { background: "#0f172a", foreground: "#e5e7eb", cursor: "#67e8f9" },
  light: { background: "#ffffff", foreground: "#0f172a", cursor: "#0f172a" },
};

export interface TerminalPaneProps {
  snapshot: ClusterSnapshot;
  theme: Theme;
  onDispatch: (events: InstallEvent[]) => void;
}

export function TerminalPane({ snapshot, theme, onDispatch }: TerminalPaneProps) {
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
      theme: THEME[theme],
    });
    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(container);
    terminalRef.current = term;

    let disposed = false;
    const safeFit = () => {
      if (disposed) return;
      requestAnimationFrame(() => {
        if (disposed) return;
        fitAddon.fit();
      });
    };
    safeFit();

    const resizeObserver = new ResizeObserver(safeFit);
    resizeObserver.observe(container);

    term.writeln("OpenShift Install Lab terminal. Type `help` for a list of commands.");
    term.write(PROMPT);

    let line = "";
    const disposable = term.onKey(({ key, domEvent }) => {
      if (domEvent.key === "Enter") {
        const result = runLine(line, snapshotRef.current);
        if (result.clearScreen) term.clear();
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
      disposed = true;
      resizeObserver.disconnect();
      disposable.dispose();
      term.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- theme is applied live via the effect below, not re-created here
  }, []);

  useEffect(() => {
    const term = terminalRef.current;
    if (!term) return;
    term.options.theme = THEME[theme];
  }, [theme]);

  return (
    <div className="h-full w-full overflow-hidden bg-(--surface) p-2">
      <div ref={containerRef} className="h-full w-full" />
    </div>
  );
}
