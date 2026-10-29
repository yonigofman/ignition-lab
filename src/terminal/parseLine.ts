export function parseLine(line: string): string[] {
  return line.trim().split(/\s+/).filter((token) => token.length > 0);
}
