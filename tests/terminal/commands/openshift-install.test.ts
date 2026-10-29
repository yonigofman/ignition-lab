import { describe, expect, it } from "vitest";
import { createInitialSnapshot } from "../../../src/engine/snapshot";
import { openshiftInstall } from "../../../src/terminal/commands/openshift-install";

function snapshotWithPhase(phase: ReturnType<typeof createInitialSnapshot>["phase"]) {
  return createInitialSnapshot({ phase });
}

describe("openshift-install wait-for bootstrap-complete", () => {
  it("prints the safe-to-remove message once bootstrap has completed", () => {
    const result = openshiftInstall(["wait-for", "bootstrap-complete", "--log-level=info"], snapshotWithPhase("bootstrap-complete"));
    expect(result.output).toMatch(/safe to remove the bootstrap/i);
  });

  it("prints a waiting message before bootstrap has completed", () => {
    const result = openshiftInstall(["wait-for", "bootstrap-complete"], snapshotWithPhase("bootstrapping"));
    expect(result.output).toMatch(/waiting/i);
    expect(result.output).not.toMatch(/safe to remove/i);
  });

  it("still reports success once past bootstrap-complete (converging/complete)", () => {
    const result = openshiftInstall(["wait-for", "bootstrap-complete"], snapshotWithPhase("complete"));
    expect(result.output).toMatch(/safe to remove the bootstrap/i);
  });
});

describe("openshift-install wait-for install-complete", () => {
  it("prints success once the install is complete", () => {
    const result = openshiftInstall(["wait-for", "install-complete"], snapshotWithPhase("complete"));
    expect(result.output).toMatch(/install complete/i);
  });

  it("prints a waiting message before the install is complete", () => {
    const result = openshiftInstall(["wait-for", "install-complete"], snapshotWithPhase("converging"));
    expect(result.output).toMatch(/waiting/i);
    expect(result.output).not.toMatch(/install complete!/i);
  });
});

describe("openshift-install unknown args", () => {
  it("prints a friendly error", () => {
    const result = openshiftInstall(["create", "manifests"], createInitialSnapshot());
    expect(result.output).toMatch(/not supported|unknown/i);
  });

  it("shows usage (not an error) when called with no arguments", () => {
    const result = openshiftInstall([], createInitialSnapshot());
    expect(result.output).toContain("wait-for bootstrap-complete");
    expect(result.output).not.toMatch(/unknown/i);
  });
});
