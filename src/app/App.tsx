import { useState } from "react";
import type { NodeId } from "../engine/events";
import { upiCompact3Node } from "../scenarios/upi-compact-3node";
import { Inspector } from "../ui/inspector/Inspector";
import { Timeline } from "../ui/timeline/Timeline";
import { TopologyCanvas } from "../ui/topology/TopologyCanvas";
import { useSimulation } from "./useSimulation";
import { useTheme } from "./useTheme";

export function App() {
  const sim = useSimulation(upiCompact3Node);
  const [selectedNodeId, setSelectedNodeId] = useState<NodeId | null>(null);
  const [theme, toggleTheme] = useTheme();

  return (
    <div className="flex h-screen w-screen flex-col bg-(--bg) text-(--text)">
      <header className="flex items-center justify-between border-b border-(--border) px-4 py-2">
        <h1 className="text-sm font-semibold uppercase tracking-wide text-(--text-muted)">
          {sim.scenario.title}
        </h1>
        <button
          type="button"
          onClick={toggleTheme}
          className="rounded border border-(--border) px-2 py-1 text-xs text-(--text-muted) hover:text-(--text)"
        >
          {theme === "dark" ? "Light mode" : "Dark mode"}
        </button>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <main className="flex-1">
          <TopologyCanvas
            snapshot={sim.snapshot}
            topology={sim.scenario.topology}
            events={sim.events}
            selectedNodeId={selectedNodeId}
            onSelectNode={setSelectedNodeId}
          />
        </main>

        <Inspector snapshot={sim.snapshot} events={sim.events} selectedNodeId={selectedNodeId} />
      </div>

      <Timeline
        scenario={sim.scenario}
        events={sim.events}
        currentT={sim.currentT}
        durationT={sim.durationT}
        isPlaying={sim.isPlaying}
        speed={sim.speed}
        onPlay={sim.play}
        onPause={sim.pause}
        onSetSpeed={sim.setSpeed}
        onSeek={sim.seek}
      />
    </div>
  );
}
