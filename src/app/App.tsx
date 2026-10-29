import { useState } from "react";
import type { NodeId } from "../engine/events";
import { ArtifactsPanel } from "../ui/artifacts/ArtifactsPanel";
import { BlockingBanner } from "../ui/blocking/BlockingBanner";
import { Inspector } from "../ui/inspector/Inspector";
import { LessonContext } from "../ui/lesson/LessonContext";
import { LessonPanel } from "../ui/lesson/LessonPanel";
import { deriveLessonState } from "../ui/lesson/deriveLessonState";
import { TerminalPane } from "../ui/terminal/TerminalPane";
import { Timeline } from "../ui/timeline/Timeline";
import { TopologyCanvas } from "../ui/topology/TopologyCanvas";
import { SCENARIO_OPTIONS } from "./scenarioOptions";
import { useSimulation } from "./useSimulation";
import { useTheme } from "./useTheme";

export function App() {
  const [scenarioIndex, setScenarioIndex] = useState(0);
  const sim = useSimulation((SCENARIO_OPTIONS[scenarioIndex] ?? SCENARIO_OPTIONS[0]).scenario);
  const [selectedNodeId, setSelectedNodeId] = useState<NodeId | null>(null);
  const [highlightedNodeId, setHighlightedNodeId] = useState<NodeId | null>(null);
  const [theme, toggleTheme] = useTheme();
  const [terminalOpen, setTerminalOpen] = useState(false);
  const [filesOpen, setFilesOpen] = useState(false);
  const [selectedArtifactId, setSelectedArtifactId] = useState<string | null>(null);

  const lessonState = deriveLessonState(sim.scenario, sim.snapshot, sim.blockingStep);

  return (
    <div className="flex h-screen w-screen flex-col bg-(--bg) text-(--text)">
      <header className="flex items-center justify-between border-b border-(--border) px-4 py-2">
        <h1 className="text-sm font-semibold uppercase tracking-wide text-(--text-muted)">
          {sim.scenario.title}
        </h1>
        <div className="flex items-center gap-2">
          <select
            value={scenarioIndex}
            onChange={(e) => {
              setScenarioIndex(Number(e.target.value));
              setSelectedNodeId(null);
              setHighlightedNodeId(null);
            }}
            className="rounded border border-(--border) bg-(--surface) px-2 py-1 text-xs text-(--text-muted) hover:text-(--text)"
          >
            {SCENARIO_OPTIONS.map((option, index) => (
              <option key={option.label} value={index}>
                {option.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setTerminalOpen((open) => !open)}
            className="rounded border border-(--border) px-2 py-1 text-xs text-(--text-muted) hover:text-(--text)"
          >
            {terminalOpen ? "Hide terminal" : "Terminal"}
          </button>
          <button
            type="button"
            onClick={() => setFilesOpen((open) => !open)}
            className="rounded border border-(--border) px-2 py-1 text-xs text-(--text-muted) hover:text-(--text)"
          >
            {filesOpen ? "Hide files" : "Files"}
          </button>
          <button
            type="button"
            onClick={toggleTheme}
            className="rounded border border-(--border) px-2 py-1 text-xs text-(--text-muted) hover:text-(--text)"
          >
            {theme === "dark" ? "Light mode" : "Dark mode"}
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <LessonContext.Provider
          value={{
            scenario: sim.scenario,
            events: sim.events,
            snapshot: sim.snapshot,
            currentT: sim.currentT,
            isPlaying: sim.isPlaying,
            lessonState,
            play: sim.play,
            pause: sim.pause,
            dispatch: sim.dispatch,
            acknowledge: sim.acknowledge,
            setHighlightedNodeId,
            setOpenArtifactId: (id) => {
              setSelectedArtifactId(id);
              setFilesOpen(id !== null);
            },
          }}
        >
          <LessonPanel />
        </LessonContext.Provider>

        <main className="flex-1">
          <TopologyCanvas
            snapshot={sim.snapshot}
            topology={sim.scenario.topology}
            events={sim.events}
            selectedNodeId={selectedNodeId}
            onSelectNode={setSelectedNodeId}
            highlightedNodeId={highlightedNodeId}
          />
        </main>

        <Inspector snapshot={sim.snapshot} events={sim.events} selectedNodeId={selectedNodeId} />
      </div>

      {terminalOpen && (
        <div className="h-64 shrink-0 overflow-hidden border-t border-(--border)">
          <TerminalPane snapshot={sim.snapshot} theme={theme} onDispatch={sim.dispatch} />
        </div>
      )}

      {filesOpen && (
        <ArtifactsPanel
          artifacts={sim.scenario.artifacts}
          selectedId={selectedArtifactId}
          onSelect={setSelectedArtifactId}
          onClose={() => setFilesOpen(false)}
        />
      )}

      <BlockingBanner lessonState={lessonState} />

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
