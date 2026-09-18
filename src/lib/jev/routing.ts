import {
  actionLabel,
  intentLabel,
  isActionId,
  isIntentCategory,
  MAX_URGENCY_LEVEL,
  NOUL_TRUE_THRESHOLD,
} from "./catalog.ts";
import type {
  ChoiceJudgment,
  DecisionProfile,
  NoulJudgment,
  ScoreJudgment,
} from "./types.ts";

export type ComposeSuccess = { ok: true; profile: DecisionProfile };
export type ComposeFailure = { ok: false; error: string };
export type ComposeResult = ComposeSuccess | ComposeFailure;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function numberMap(value: unknown): Record<string, number> | null {
  if (!isRecord(value)) return null;
  const out: Record<string, number> = {};
  for (const [key, item] of Object.entries(value)) {
    if (!isFiniteNumber(item)) return null;
    out[key] = item;
  }
  return out;
}

function criterionText(value: unknown): string {
  if (typeof value === "string") return value;
  if (isRecord(value) && typeof value.what === "string") return value.what;
  if (value == null) return "";
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function legendMap(value: unknown): Record<string, string> {
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

export function parseChoice(value: unknown, field: string): ChoiceJudgment | string {
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
    return `${field} score ${value.score} is outside 0–${max}.`;
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

export function parseNoul(value: unknown, field: string): NoulJudgment | string {
  if (!isRecord(value) || value.type !== "noul") {
    return `${field} is not a Noul answer.`;
  }
  if (!isFiniteNumber(value.noul)) {
    return `${field} is missing a noul probability.`;
  }
  if (!within(value.noul, 0, 1, 0.02)) {
    return `${field} noul ${value.noul} is outside 0–1.`;
  }
  return { type: "noul", noul: clamp(value.noul, 0, 1) };
}

export function noulIsTrue(noul: number, threshold = NOUL_TRUE_THRESHOLD): boolean {
  return noul >= threshold;
}

export function composeProfile(answers: unknown): ComposeResult {
  if (!isRecord(answers)) {
    return { ok: false, error: "Jev returned no answers object." };
  }

  const intent = parseChoice(answers.intent_category, "intent_category");
  if (typeof intent === "string") return { ok: false, error: intent };

  const action = parseChoice(answers.recommended_action, "recommended_action");
  if (typeof action === "string") return { ok: false, error: action };

  const urgency = parseScore(answers.urgency, "urgency", MAX_URGENCY_LEVEL);
  if (typeof urgency === "string") return { ok: false, error: urgency };

  const human = parseNoul(answers.human_escalation, "human_escalation");
  if (typeof human === "string") return { ok: false, error: human };

  const ambiguity = parseNoul(answers.ambiguity, "ambiguity");
  if (typeof ambiguity === "string") return { ok: false, error: ambiguity };

  const warnings: string[] = [];
  if (!isIntentCategory(intent.choice)) {
    warnings.push(`Unknown intent_category "${intent.choice}".`);
  }
  if (!isActionId(action.choice)) {
    warnings.push(`Unknown recommended_action "${action.choice}".`);
  }

  const profile: DecisionProfile = {
    intent: {
      ...intent,
      label: intentLabel(intent.choice),
      known: isIntentCategory(intent.choice),
    },
    action: {
      ...action,
      label: actionLabel(action.choice),
      known: isActionId(action.choice),
    },
    urgency: { ...urgency, max: MAX_URGENCY_LEVEL },
    humanEscalation: { ...human, flagged: noulIsTrue(human.noul) },
    ambiguity: { ...ambiguity, flagged: noulIsTrue(ambiguity.noul) },
    warnings,
  };

  return { ok: true, profile };
}

export function routeHandlerLabel(actionId: string): string {
  return actionLabel(actionId);
}
