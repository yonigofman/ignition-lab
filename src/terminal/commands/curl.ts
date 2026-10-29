import { LB_FRONTENDS } from "../../engine/snapshot";
import { lookupDns } from "../dnsLookup";
import type { Command } from "../types";

export const curl: Command = (args, snapshot) => {
  const urlArg = args.find((a) => a.startsWith("http://") || a.startsWith("https://"));
  if (!urlArg) {
    return { output: "usage: curl [-k] <url>" };
  }

  let url: URL;
  try {
    url = new URL(urlArg);
  } catch {
    return { output: `curl: (3) URL using bad/illegal format or missing URL` };
  }

  const hostname = url.hostname;
  const port = Number(url.port || (url.protocol === "https:" ? 443 : 80));

  if (!lookupDns(snapshot.dns, hostname)) {
    return { output: `curl: (6) Could not resolve host: ${hostname}` };
  }

  const frontend = LB_FRONTENDS.find((f) => f === port);
  const backends = frontend ? snapshot.lb[frontend] : {};
  const hasUpBackend = Object.values(backends).some((state) => state === "up");
  if (!hasUpBackend) {
    return { output: `curl: (7) Failed to connect to ${hostname} port ${port}: Connection refused` };
  }

  return {
    output: [`HTTP/1.1 200 OK`, `Content-Type: application/json`, "", `{"ignition":{"version":"3.2.0"}}`].join(
      "\n"
    ),
  };
};
