import type {
  ChoiceJudgment,
  NoulJudgment,
  ScoreJudgment,
} from "./types.ts";

/**
 * Canonical record guard for this package. Raw Jev answers arrive as
 * `unknown` JSON; every parser below narrows through these two guards.
 */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

/** Parses a flat map of finite numbers, or null when any entry is invalid. */
export function numberMap(value: unknown): Record<string, number> | null {
  if (!isRecord(value)) return null;
  const out: Record<string, number> = {};
  for (const [key, item] of Object.entries(value)) {
    if (!isFiniteNumber(item)) return null;
    out[key] = item;
  }
  return out;
}

/** Coerces a criteria entry (string or structured object) to display text. */
export function criterionText(value: unknown): string {
  if (typeof value === "string") return value;
  if (isRecord(value) && typeof value.what === "string") return value.what;
  if (value == null) return "";
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

/** Parses a Score legend map ({ "0": "desc", ... }), tolerating structured entries. */
export function legendMap(value: unknown): Record<string, string> {
  if (!isRecord(value)) return {};
  const out: Record<string, string> = {};
  for (const [key, item] of Object.entries(value)) {
    out[key] = criterionText(item);
  }
  return out;
}

function within(value: number, min: number, max: number, eps = 1e-6): boolean {
  return value >= min - eps && value <= max + eps;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Parses a raw Choice answer into a typed judgment.
 * Returns a human-readable parse error string on failure.
 */
export function parseChoice(
  value: unknown,
  field: string,
): ChoiceJudgment | string {
  if (!isRecord(value) || value.type !== "choice") {
    return `${field} is not a Choice answer.`;
  }
  if (typeof value.choice !== "string" || value.choice.length === 0) {
    return `${field} is missing a selected choice.`;
  }
  const probabilities = numberMap(value.probabilities);
  if (!probabilities) {
    return `${field} is missing a probability distribution.`;
  }
  const confidence = isFiniteNumber(value.confidence) ? value.confidence : null;
  return {
    type: "choice",
    choice: value.choice,
    probabilities,
    confidence,
  };
}

/**
 * Parses a raw Score answer into a typed judgment against a rubric of
 * `max + 1` levels. Scores may fall between integer levels; tiny
 * floating-point overshoot is clamped, gross violations are rejected.
 */
export function parseScore(
  value: unknown,
  field: string,
  max: number,
): ScoreJudgment | string {
  if (!isRecord(value) || value.type !== "score") {
    return `${field} is not a Score answer.`;
  }
  if (!isFiniteNumber(value.score)) {
    return `${field} is missing a numeric score.`;
  }
  if (!within(value.score, 0, max, 0.05)) {
    return `${field} score ${value.score} is outside 0\u2013${max}.`;
  }
  const probabilities = numberMap(value.probabilities);
  if (!probabilities) {
    return `${field} is missing level probabilities.`;
  }
  const confidence = isFiniteNumber(value.confidence) ? value.confidence : null;
  return {
    type: "score",
    score: clamp(value.score, 0, max),
    probabilities,
    legend: legendMap(value.legend),
    confidence,
  };
}

/** Parses a raw Noul answer into a typed judgment (probability of "yes"). */
export function parseNoul(
  value: unknown,
  field: string,
): NoulJudgment | string {
  if (!isRecord(value) || value.type !== "noul") {
    return `${field} is not a Noul answer.`;
  }
  if (!isFiniteNumber(value.noul)) {
    return `${field} is missing a noul probability.`;
  }
  if (!within(value.noul, 0, 1, 0.02)) {
    return `${field} noul ${value.noul} is outside 0\u20131.`;
  }
  return { type: "noul", noul: clamp(value.noul, 0, 1) };
}

/** Normalizes a Score position onto 0\u20131 by dividing by its top level. */
export function normalizeScore(score: number, max: number): number {
  if (max <= 0) return 0;
  return clamp(score / max, 0, 1);
}

/** Mean confidence across a list of confidence values (null entries ignored). */
export function meanConfidence(values: Array<number | null | undefined>): number | null {
  const present = values.filter((v): v is number => isFiniteNumber(v));
  if (present.length === 0) return null;
  return present.reduce((a, b) => a + b, 0) / present.length;
}

/** Probability of the selected option in a Choice judgment, or null. */
export function chosenProbability(judgment: ChoiceJudgment): number | null {
  const value = judgment.probabilities[judgment.choice];
  return isFiniteNumber(value) ? value : null;
}
