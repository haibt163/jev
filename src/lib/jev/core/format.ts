export function formatProb(n: number): string {
  return n.toFixed(3);
}

export function formatPct(n: number): string {
  const pct = n * 100;
  if (pct > 0 && pct < 1) return "<1%";
  return `${Math.round(pct)}%`;
}

export function formatScore(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

export function formatMs(n: number): string {
  return `${Math.round(n)} ms`;
}

export function yesNo(flag: boolean): string {
  return flag ? "Yes" : "No";
}

export function sortedEntries(map: Record<string, number>): [string, number][] {
  return Object.entries(map).sort((a, b) => b[1] - a[1]);
}
