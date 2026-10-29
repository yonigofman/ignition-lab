export function lookupDns(dns: Record<string, string>, name: string): string | undefined {
  if (dns[name]) return dns[name];

  for (const [key, ip] of Object.entries(dns)) {
    if (!key.startsWith("*.")) continue;
    const suffix = key.slice(1);
    if (name !== suffix.slice(1) && name.endsWith(suffix)) {
      return ip;
    }
  }

  return undefined;
}
