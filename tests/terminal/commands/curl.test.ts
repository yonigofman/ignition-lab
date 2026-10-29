import { describe, expect, it } from "vitest";
import { createInitialSnapshot } from "../../../src/engine/snapshot";
import { curl } from "../../../src/terminal/commands/curl";

function snapshotWith(opts: { dns?: boolean; lbUp?: boolean }) {
  return createInitialSnapshot({
    dns: opts.dns ? { "api-int.demo.lab.example.com": "192.168.1.10" } : {},
    lb: {
      6443: {},
      22623: opts.lbUp ? { bootstrap: "up" } : { bootstrap: "down" },
      80: {},
      443: {},
    },
  });
}

describe("curl", () => {
  it("succeeds when DNS resolves and the LB has an up backend on the matching frontend", () => {
    const result = curl(
      ["-k", "https://api-int.demo.lab.example.com:22623/config/master"],
      snapshotWith({ dns: true, lbUp: true })
    );
    expect(result.output).not.toMatch(/curl: \(/);
  });

  it("fails with a DNS error when the host does not resolve", () => {
    const result = curl(
      ["-k", "https://api-int.demo.lab.example.com:22623/config/master"],
      snapshotWith({ dns: false, lbUp: true })
    );
    expect(result.output).toContain("curl: (6)");
  });

  it("fails with a connect error when the LB has no up backend on that frontend", () => {
    const result = curl(
      ["-k", "https://api-int.demo.lab.example.com:22623/config/master"],
      snapshotWith({ dns: true, lbUp: false })
    );
    expect(result.output).toContain("curl: (7)");
  });

  it("prints usage when no URL is given", () => {
    const result = curl(["-k"], snapshotWith({ dns: true, lbUp: true }));
    expect(result.output).toMatch(/usage/i);
  });
});
