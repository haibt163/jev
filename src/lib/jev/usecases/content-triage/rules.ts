import type { TriageJudgment } from "./types.ts";

export type TriageAction =
  | "reply"
  | "forward_support"
  | "archive"
  | "flag_review";

export type TriageWorkflow = {
  action: TriageAction;
  explanation: string;
  facts: string[];
};

const SUPPORT_CATEGORIES = new Set(["bug_report", "billing_issue"]);

/**
 * Deterministic routing from typed judgments: review nouls gate on the
 * threshold, spam archives, known support categories forward, the rest reply.
 */
export function deriveTriageWorkflow(judgment: TriageJudgment): TriageWorkflow {
  const facts: string[] = [
    `Category: ${judgment.category.label}`,
    `Priority: ${judgment.priority.score >= 2.5 ? "urgent" : judgment.priority.score >= 1.5 ? "elevated" : "normal"}`,
  ];

  if (judgment.reviewNeeded.flagged) {
    facts.push("Review flagged");
    return {
      action: "flag_review",
      explanation:
        `Jev judged this as ${judgment.category.label.toLowerCase()} and the review probability crossed the threshold, so the application holds it for a person instead of acting automatically.`,
      facts,
    };
  }

  if (judgment.category.known && judgment.category.choice === "spam") {
    facts.push("Spam");
    return {
      action: "archive",
      explanation:
        "Jev classified this as spam and review was not flagged, so the application archives it without a reply.",
      facts,
    };
  }

  if (judgment.category.known && SUPPORT_CATEGORIES.has(judgment.category.choice)) {
    facts.push("Support queue");
    return {
      action: "forward_support",
      explanation:
        `The application forwards this ${judgment.category.label.toLowerCase()} to the support queue with ${judgment.priority.score >= 2.5 ? "urgent" : "normal"} priority.`,
      facts,
    };
  }

  return {
    action: "reply",
    explanation:
      `Jev judged this as ${judgment.category.label.toLowerCase()} and no review was flagged, so the application sends the standard response for this category.`,
    facts,
  };
}
