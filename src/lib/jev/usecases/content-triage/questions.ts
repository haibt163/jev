export const TRIAGE_CATEGORIES = [
  "praise",
  "bug_report",
  "feature_request",
  "billing_issue",
  "question",
  "spam",
  "other",
] as const;

export type TriageCategory = (typeof TRIAGE_CATEGORIES)[number];

export const TRIAGE_CATEGORY_LABELS: Record<TriageCategory, string> = {
  praise: "Praise",
  bug_report: "Bug Report",
  feature_request: "Feature Request",
  billing_issue: "Billing Issue",
  question: "Question",
  spam: "Spam",
  other: "Other",
};

const CATEGORY_CRITERIA: Record<TriageCategory, string> = {
  praise:
    "Positive feedback: the writer expresses satisfaction or appreciation.",
  bug_report:
    "The writer reports broken or incorrect behavior in the product.",
  feature_request:
    "The writer asks for new or changed functionality.",
  billing_issue:
    "The writer raises charges, invoices, refunds, or payment problems.",
  question:
    "The writer asks for information without reporting a problem.",
  spam: "Unwanted promotional content or irrelevant solicitation.",
  other: "The message does not fit any known category.",
};

export type TriageState = {
  message: string;
  known_categories: string[];
};

export const JEV_QUESTIONS = {
  category: {
    type: "choice" as const,
    instructions:
      "Which known category best describes `message`? Use `known_categories` as the known set and pick the single closest fit.",
    criteria: CATEGORY_CRITERIA,
  },
  priority: {
    type: "score" as const,
    instructions:
      "How urgently should a team act on `message`? Judge the content of the message, not its tone alone.",
    criteria: [
      "Routine; can wait for a scheduled pass",
      "Low; handle within normal response times",
      "Elevated; a team should look at this today",
      "Urgent; act immediately, users are blocked or money is involved",
    ],
  },
  review_needed: {
    type: "noul" as const,
    instructions:
      "Should a person review `message` before any automated action is taken on it?",
    criteria: {
      true: "The message needs a person's judgment before action.",
      false: "The message can be handled by automated routing.",
    },
  },
};

export function buildState(message: string): TriageState {
  return {
    message,
    known_categories: [...TRIAGE_CATEGORIES],
  };
}
