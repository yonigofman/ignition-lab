import { describe, expect, it } from "vitest";
import { lookupDns } from "../../src/terminal/dnsLookup";

const dns = {
  "api.demo.lab.example.com": "192.168.1.10",
  "*.apps.demo.lab.example.com": "192.168.1.10",
};

describe("lookupDns", () => {
  it("returns an exact match when one exists", () => {
    expect(lookupDns(dns, "api.demo.lab.example.com")).toBe("192.168.1.10");
  });

  it("matches a wildcard record for any subdomain", () => {
    expect(lookupDns(dns, "console-openshift-console.apps.demo.lab.example.com")).toBe("192.168.1.10");
    expect(lookupDns(dns, "test.apps.demo.lab.example.com")).toBe("192.168.1.10");
  });

  it("prefers an exact match over a wildcard if both could apply", () => {
    const withBoth = { ...dns, "test.apps.demo.lab.example.com": "10.0.0.9" };
    expect(lookupDns(withBoth, "test.apps.demo.lab.example.com")).toBe("10.0.0.9");
  });

  it("returns undefined when nothing matches", () => {
    expect(lookupDns(dns, "missing.demo.lab.example.com")).toBeUndefined();
  });

  it("does not match a name outside the wildcard's domain", () => {
    expect(lookupDns(dns, "apps.demo.lab.example.com")).toBeUndefined();
    expect(lookupDns(dns, "api.other.example.com")).toBeUndefined();
  });
});
