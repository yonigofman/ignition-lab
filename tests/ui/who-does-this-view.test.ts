import { describe, expect, it } from "vitest";
import type { InstallEvent } from "../../src/engine/events";
import { deriveWhoDoesThisView } from "../../src/ui/contrast/deriveWhoDoesThisView";

const events: InstallEvent[] = [
  { t: 10, type: "bmc.power", node: "master-0", protocol: "redfish", action: "on" },
  {
    t: 110,
    type: "csr.approved",
    id: "csr-worker-0-client",
    by: "machine-approver",
    actor: "installer",
    contrastNote: "The machine-approver approves this automatically.",
  },
  {
    t: 170,
    type: "bootstrap.removed",
    actor: "installer",
    contrastNote: "The installer destroys bootstrap automatically.",
  },
];

describe("deriveWhoDoesThisView", () => {
  it("shows nothing when the toggle is off, regardless of time", () => {
    expect(deriveWhoDoesThisView(events, 110, false).active).toBeNull();
  });

  it("shows nothing when no tagged event falls within the trailing window", () => {
    expect(deriveWhoDoesThisView(events, 50, true).active).toBeNull();
  });

  it("surfaces a tagged event's contrast note within the trailing window", () => {
    const view = deriveWhoDoesThisView(events, 111, true);
    expect(view.active).toEqual({
      actor: "installer",
      contrastNote: "The machine-approver approves this automatically.",
    });
  });

  it("stops surfacing it once the window has passed", () => {
    const view = deriveWhoDoesThisView(events, 116, true, 5);
    expect(view.active).toBeNull();
  });

  it("picks the most recent tagged event when more than one falls in the window", () => {
    const view = deriveWhoDoesThisView(events, 170, true, 65);
    expect(view.active?.contrastNote).toBe("The installer destroys bootstrap automatically.");
  });

  it("defaults actor to installer when a contrastNote is set without an explicit actor", () => {
    const untaggedActor: InstallEvent[] = [
      { t: 5, type: "bootstrap.removed", contrastNote: "Automatic, no actor set explicitly." },
    ];
    const view = deriveWhoDoesThisView(untaggedActor, 5, true);
    expect(view.active?.actor).toBe("installer");
  });
});
