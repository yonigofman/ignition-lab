import { useState } from "react";
import type { NodeId } from "../engine/events";
import { ArtifactsPanel } from "../ui/artifacts/ArtifactsPanel";
import { BlockingBanner } from "../ui/blocking/BlockingBanner";
import { ToolbarButton } from "../ui/chrome/ToolbarButton";
import { deriveWhoDoesThisView } from "../ui/contrast/deriveWhoDoesThisView";
import { WhoDoesThisBanner } from "../ui/contrast/WhoDoesThisBanner";
import { CaptionBanner } from "../ui/demo/CaptionBanner";
import { deriveCaptionView } from "../ui/demo/deriveCaptionView";
import { Inspector } from "../ui/inspector/Inspector";
import { LessonContext } from "../ui/lesson/LessonContext";
import { LessonPanel } from "../ui/lesson/LessonPanel";
import { deriveLessonState } from "../ui/lesson/deriveLessonState";
import { TerminalPane } from "../ui/terminal/TerminalPane";
import { Timeline } from "../ui/timeline/Timeline";
import { TopologyCanvas } from "../ui/topology/TopologyCanvas";
import { SCENARIO_OPTIONS } from "./scenarioOptions";
import { useDemoMode } from "./useDemoMode";
import { useMediaQuery } from "./useMediaQuery";
import { useSimulation } from "./useSimulation";
import { useTheme } from "./useTheme";

const DEMO_SCENARIO_INDEX = 0;

export function App() {
  const [scenarioIndex, setScenarioIndex] = useState(0);
  const [demoMode, setDemoMode] = useState(false);
  const activeScenarioIndex = demoMode ? DEMO_SCENARIO_INDEX : scenarioIndex;
  const sim = useSimulation((SCENARIO_OPTIONS[activeScenarioIndex] ?? SCENARIO_OPTIONS[0]).scenario);
  const [selectedNodeId, setSelectedNodeId] = useState<NodeId | null>(null);
  const [highlightedNodeId, setHighlightedNodeId] = useState<NodeId | null>(null);
  const [theme, toggleTheme] = useTheme();
  const [terminalOpen, setTerminalOpen] = useState(false);
  const [filesOpen, setFilesOpen] = useState(false);
  const [selectedArtifactId, setSelectedArtifactId] = useState<string | null>(null);
  const [whoDoesThisOn, setWhoDoesThisOn] = useState(false);
  const isNarrow = useMediaQuery("(max-width: 767px)");

  const lessonState = deriveLessonState(sim.scenario, sim.snapshot, sim.blockingStep);
  const whoDoesThisView = deriveWhoDoesThisView(sim.events, sim.currentT, whoDoesThisOn);
  const captionView = deriveCaptionView(sim.scenario, sim.currentT);

  const { enterDemoMode, exitDemoMode } = useDemoMode(sim, demoMode, setDemoMode, scenarioIndex, setScenarioIndex, () => {
    setTerminalOpen(false);
    setFilesOpen(false);
  });

  return (
    <div className="flex h-screen w-screen flex-col bg-(--bg) text-(--text)">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-(--border) px-4 py-2">
        <h1 className="text-sm font-semibold uppercase tracking-wide text-(--text-muted)">
          {sim.scenario.title}
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          {!demoMode && (
            <>
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
              <ToolbarButton onClick={() => setTerminalOpen((open) => !open)} active={terminalOpen}>
                {terminalOpen ? "Hide terminal" : "Terminal"}
              </ToolbarButton>
              <ToolbarButton onClick={() => setFilesOpen((open) => !open)} active={filesOpen}>
                {filesOpen ? "Hide files" : "Files"}
              </ToolbarButton>
            </>
          )}
          <ToolbarButton onClick={() => setWhoDoesThisOn((on) => !on)} active={whoDoesThisOn}>
            Who does this?
          </ToolbarButton>
          <ToolbarButton onClick={demoMode ? exitDemoMode : enterDemoMode} active={demoMode}>
            {demoMode ? "Exit demo" : "Demo mode"}
          </ToolbarButton>
          <ToolbarButton onClick={toggleTheme}>{theme === "dark" ? "Light mode" : "Dark mode"}</ToolbarButton>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {!demoMode && (
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
        )}

        <main className="relative flex-1">
          <TopologyCanvas
            snapshot={sim.snapshot}
            topology={sim.scenario.topology}
            events={sim.events}
            selectedNodeId={selectedNodeId}
            onSelectNode={setSelectedNodeId}
            highlightedNodeId={highlightedNodeId}
          />
          {demoMode && <CaptionBanner view={captionView} />}
        </main>

        {!(demoMode && isNarrow) && (
          <Inspector snapshot={sim.snapshot} events={sim.events} selectedNodeId={selectedNodeId} />
        )}
      </div>

      {!demoMode && terminalOpen && (
        <div className="h-64 shrink-0 overflow-hidden border-t border-(--border)">
          <TerminalPane snapshot={sim.snapshot} theme={theme} onDispatch={sim.dispatch} />
        </div>
      )}

      {!demoMode && filesOpen && (
        <ArtifactsPanel
          artifacts={sim.scenario.artifacts}
          selectedId={selectedArtifactId}
          onSelect={setSelectedArtifactId}
          onClose={() => setFilesOpen(false)}
        />
      )}

      <WhoDoesThisBanner view={whoDoesThisView} />
      {!demoMode && <BlockingBanner lessonState={lessonState} />}

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
