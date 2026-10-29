import { describe, expect, it } from "vitest";
import type { Scenario } from "../../src/engine/scenario";
import { upiCompact3Node } from "../../src/scenarios/upi-compact-3node";
import { upi3m2w } from "../../src/scenarios/upi-3m-2w";

const REQUIRED_ARTIFACT_IDS = [
  "install-config",
  "manifests",
  "bootstrap-ignition",
  "master-ignition",
  "worker-ignition",
  "metadata",
  "kubeconfig",
  "kubeadmin-password",
];

const SCENARIOS: Scenario[] = [upiCompact3Node, upi3m2w];

describe.each(SCENARIOS)("$title > artifacts", (scenario) => {
  it("defines every required artifact exactly once", () => {
    const ids = scenario.artifacts.map((a) => a.id);
    for (const required of REQUIRED_ARTIFACT_IDS) {
      expect(ids.filter((id) => id === required)).toHaveLength(1);
    }
  });

  it("gives every artifact a non-empty path and content", () => {
    for (const artifact of scenario.artifacts) {
      expect(artifact.path.length).toBeGreaterThan(0);
      expect(artifact.content.length).toBeGreaterThan(0);
    }
  });

  it("points the pointer ignitions at the scenario's own api-int hostname over 22623", () => {
    const apiIntHost = Object.keys(scenario.initialState.dns ?? {}).find((name) => name.startsWith("api-int."));
    expect(apiIntHost).toBeDefined();

    const masterIgnition = scenario.artifacts.find((a) => a.id === "master-ignition");
    const workerIgnition = scenario.artifacts.find((a) => a.id === "worker-ignition");

    expect(masterIgnition?.content).toContain(`${apiIntHost}:22623/config/master`);
    expect(workerIgnition?.content).toContain(`${apiIntHost}:22623/config/worker`);
  });

  it("names the scenario's own cluster/base domain in install-config.yaml", () => {
    const apiIntHost = Object.keys(scenario.initialState.dns ?? {}).find((name) => name.startsWith("api-int."));
    const [, clusterName, ...domainParts] = apiIntHost?.split(".") ?? [];
    const baseDomain = domainParts.join(".");

    const installConfig = scenario.artifacts.find((a) => a.id === "install-config");
    expect(installConfig?.content).toContain(`name: ${clusterName}`);
    expect(installConfig?.content).toContain(`baseDomain: ${baseDomain}`);
  });

  it("marks the pointer ignitions, the truncated bootstrap ignition, and the redacted auth files with a note", () => {
    for (const id of ["master-ignition", "worker-ignition", "bootstrap-ignition", "kubeconfig", "kubeadmin-password"]) {
      const artifact = scenario.artifacts.find((a) => a.id === id);
      expect(artifact?.note, `expected ${id} to have a note`).toBeTruthy();
    }
  });

  it("never embeds anything that looks like a real secret in kubeconfig/kubeadmin-password", () => {
    const kubeconfig = scenario.artifacts.find((a) => a.id === "kubeconfig");
    const kubeadminPassword = scenario.artifacts.find((a) => a.id === "kubeadmin-password");
    expect(kubeconfig?.content).toMatch(/REDACTED/i);
    expect(kubeadminPassword?.content).toMatch(/REDACTED|fake|placeholder/i);
  });
});
