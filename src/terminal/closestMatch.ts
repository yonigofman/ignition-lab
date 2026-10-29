function levenshtein(a: string, b: string): number {
  let prevRow = Array.from({ length: b.length + 1 }, (_, j) => j);

  for (let i = 1; i <= a.length; i++) {
    const currentRow = [i];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      const deletion = (prevRow[j] ?? 0) + 1;
      const insertion = (currentRow[j - 1] ?? 0) + 1;
      const substitution = (prevRow[j - 1] ?? 0) + cost;
      currentRow.push(Math.min(deletion, insertion, substitution));
    }
    prevRow = currentRow;
  }

  return prevRow[b.length] ?? Math.max(a.length, b.length);
}

const MAX_DISTANCE = 3;

export function closestMatch(input: string, candidates: string[]): string | null {
  let best: { name: string; distance: number } | null = null;
  for (const candidate of candidates) {
    const distance = levenshtein(input, candidate);
    if (!best || distance < best.distance) {
      best = { name: candidate, distance };
    }
  }
  return best && best.distance <= MAX_DISTANCE ? best.name : null;
}
