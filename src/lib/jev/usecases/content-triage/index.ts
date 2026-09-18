import { JEV_MODEL } from "../../core/constants.ts";
import type { UseCaseDef } from "../../core/types.ts";
import { buildState, JEV_QUESTIONS } from "./questions.ts";
import type { TriageState } from "./questions.ts";
import { composeTriageJudgment } from "./normalize.ts";
import { TRIAGE_THRESHOLDS } from "./types.ts";
import type { TriageJudgment } from "./types.ts";

export {
  buildState,
  JEV_QUESTIONS,
  TRIAGE_CATEGORIES,
  TRIAGE_CATEGORY_LABELS,
} from "./questions.ts";
export { composeTriageJudgment } from "./normalize.ts";
export { deriveTriageWorkflow } from "./rules.ts";
export { TRIAGE_THRESHOLDS, MAX_PRIORITY_LEVEL } from "./types.ts";
export type { TriageJudgment } from "./types.ts";

export const TRIAGE_EXAMPLES = [
  {
    id: "praise",
    label: "Praise",
    text: "Just wanted to say the new dashboard is fantastic, our team loves it.",
  },
  {
    id: "bug",
    label: "Bug report",
    text: "Exports fail with a spinner that never finishes since this morning.",
  },
  {
    id: "billing",
    label: "Billing issue",
    text: "I was charged twice for the same order, please refund the duplicate.",
  },
  {
    id: "vague",
    label: "Vague message",
    text: "It doesn't work. Fix it.",
  },
  {
    id: "spam",
    label: "Spam",
    text: "BUY NOW!!! Cheap followers and likes, amazing prices, click here!",
  },
] as const;

const MAX_ITEMS = 20;
const MAX_MESSAGE_LENGTH = 4000;

function validateInput(input: unknown): string | null {
  if (typeof input !== "object" || input == null) return "Provide a message to triage.";
  const record = input as Record<string, unknown>;
  const message = typeof record.message === "string" ? record.message.trim() : "";
  if (!message) return "Provide a message to triage.";
  if (message.length > MAX_MESSAGE_LENGTH) {
    return `Keep the message under ${MAX_MESSAGE_LENGTH} characters.`;
  }
  return null;
}

/** Batchable: the registry runs this pipeline once per message, in parallel. */
export const contentTriage: UseCaseDef<TriageState, { message: string }, TriageJudgment> = {
  id: "content-triage",
  title: "Content Triage",
  shortDescription:
    "Classify a message, judge its priority, and let application rules decide the routing.",
  model: JEV_MODEL,
  validateInput,
  buildState: (input) => buildState(input.message),
  questions: JEV_QUESTIONS,
  normalize: (rawAnswers) => {
    const result = composeTriageJudgment(rawAnswers, TRIAGE_THRESHOLDS.noulTrueThreshold);
    return result.ok ? result.judgment : result.error;
  },
  thresholds: TRIAGE_THRESHOLDS,
  presentation: {
    icon: "inbox",
    primaryMetricPath: "category.label",
    showReviewIndication: true,
  },
  batchable: true,
  examples: TRIAGE_EXAMPLES,
};

export { MAX_ITEMS };
