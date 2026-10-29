import { lookupDns } from "../dnsLookup";
import type { Command } from "../types";

export const dig: Command = (args, snapshot) => {
  const name = args[0];
  if (!name) {
    return { output: "usage: dig <name>" };
  }

  const ip = lookupDns(snapshot.dns, name);
  if (!ip) {
    return {
      output: [
        `; <<>> dig <<>> ${name}`,
        `;; status: NXDOMAIN, id: 0`,
        `;; QUESTION SECTION:`,
        `;${name}.\t\tIN\tA`,
        "",
        ";; no servers could be reached",
      ].join("\n"),
    };
  }

  return {
    output: [
      `; <<>> dig <<>> ${name}`,
      `;; status: NOERROR, id: 0`,
      `;; QUESTION SECTION:`,
      `;${name}.\t\tIN\tA`,
      "",
      ";; ANSWER SECTION:",
      `${name}.\t30\tIN\tA\t${ip}`,
    ].join("\n"),
  };
};
