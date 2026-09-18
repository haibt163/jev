import { JEV_MODEL } from "../../core/constants.ts";
import type { UseCaseDef } from "../../core/types.ts";
import {
  EXAMPLES,
  INTENT_CATEGORIES,
  MAX_MESSAGE_LENGTH,
  MAX_URGENCY_LEVEL,
} from "./catalog.ts";
import { buildState, JEV_QUESTIONS } from "./questions.ts";
import type { RouterState } from "./questions.ts";
import { composeProfile } from "./normalize.ts";
import { SUPPORT_THRESHOLDS } from "./types.ts";
import type { DecisionProfile } from "./types.ts";

export * from "./catalog.ts";
export { buildState, JEV_QUESTIONS } from "./questions.ts";
export { composeProfile, noulIsTrue, routeHandlerLabel } from "./normalize.ts";
export { deriveWorkflow } from "./rules.ts";
export { SUPPORT_THRESHOLDS } from "./types.ts";
export type { DecisionProfile, AnalyzeResponse } from "./types.ts";

function validateInput(input: unknown): string | null {
  if (typeof input !== "string") return "Enter a message to analyze.";
  const trimmed = input.trim();
  if (!trimmed) return "Enter a message to analyze.";
  if (trimmed.length > MAX_MESSAGE_LENGTH) {
    return `Keep the message under ${MAX_MESSAGE_LENGTH} characters.`;
  }
  return null;
}

export const supportRouter: UseCaseDef<RouterState, string, DecisionProfile> = {
  id: "support-router",
  title: "Support Router",
  shortDescription:
    "Classify a customer request, pick a handler, and judge urgency and escalation.",
  model: JEV_MODEL,
  validateInput,
  buildState: (input) => buildState(input),
  questions: JEV_QUESTIONS,
  normalize: (rawAnswers) => {
    const result = composeProfile(rawAnswers);
    return result.ok ? result.profile : result.error;
  },
  thresholds: SUPPORT_THRESHOLDS,
  presentation: {
    icon: "route",
    primaryMetricPath: "intent.label",
    showReviewIndication: true,
  },
  batchable: false,
  examples: EXAMPLES,
};

export { INTENT_CATEGORIES, MAX_MESSAGE_LENGTH, MAX_URGENCY_LEVEL, EXAMPLES };
