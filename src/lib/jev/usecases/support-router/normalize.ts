import { isRecord, parseChoice, parseNoul, parseScore } from "../../core/parse.ts";
import {
  actionLabel,
  intentLabel,
  isActionId,
  isIntentCategory,
  MAX_URGENCY_LEVEL,
  NOUL_TRUE_THRESHOLD,
} from "./catalog.ts";
import type { DecisionProfile } from "./types.ts";

export type ComposeSuccess = { ok: true; profile: DecisionProfile };
export type ComposeFailure = { ok: false; error: string };
export type ComposeResult = ComposeSuccess | ComposeFailure;

export function noulIsTrue(noul: number, threshold: number = NOUL_TRUE_THRESHOLD): boolean {
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
