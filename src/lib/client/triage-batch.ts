const MAX_LINE = 4000;

/** Splits the batch textarea into trimmed, non-empty messages. */
export function splitBatch(raw: string): string[] {
  return raw
    .split(/\n+/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => line.slice(0, MAX_LINE));
}

