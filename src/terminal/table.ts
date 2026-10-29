export function formatTable(header: string[], rows: string[][]): string {
  const widths = header.map((h, col) => Math.max(h.length, ...rows.map((row) => row[col]?.length ?? 0)));

  const formatRow = (cells: string[]): string =>
    cells.map((cell, col) => cell.padEnd(widths[col] ?? cell.length)).join("  ").trimEnd();

  return [formatRow(header), ...rows.map(formatRow)].join("\n");
}
