import type { DecisionProfile } from "./types.ts";

/**
 * Deterministic workflow derived from typed judgments.
 * Jev judged; these rules decide what the application does.
 */

export type SupportAction =
  | "route"
  | "route_and_flag"
  | "clarify"
  | "manual_review";

export type SupportWorkflow = {
  action: SupportAction;
  /** Application-generated explanation naming the judgment and the rule. */
  explanation: string;
  /** Short chips summarizing the deterministic outcome. */
  facts: string[];
};

/**
 * Ambiguity or escalation nouls hold the case for clarification or human
 * review; high urgency routes with a priority flag; otherwise the chosen
 * handler takes it automatically.
 */
export function deriveWorkflow(profile: DecisionProfile): SupportWorkflow {
  const facts: string[] = [];
  const action = profile.action.known ? profile.action.label : profile.action.choice;
  const intent = profile.intent.known ? profile.intent.label : profile.intent.choice;

  facts.push(`Intent: ${intent}`);
  facts.push(`Handler: ${action}`);
  facts.push(
    `Urgency: ${profile.urgency.score >= 3 ? "high" : profile.urgency.score >= 2 ? "moderate" : "routine"}`,
  );

  if (profile.ambiguity.flagged) {
    facts.push("Ambiguity flagged");
    return {
      action: "clarify",
      explanation:
        `The request reads as a ${intent.toLowerCase()} matter, but Jev flagged it as materially ambiguous, so the application holds it for clarification before dispatching to ${action.toLowerCase()}.`,
      facts,
    };
  }

  if (profile.humanEscalation.flagged) {
    facts.push("Human review flagged");
    return {
      action: "route_and_flag",
      explanation:
        `Jev routes this as ${intent.toLowerCase()} with a copy to a person: the escalation probability crossed the review threshold.`,
      facts,
    };
  }

  const highUrgency = profile.urgency.score >= 3;
  if (highUrgency) facts.push("High urgency");

  return {
    action: highUrgency ? "route_and_flag" : "route",
    explanation: highUrgency
      ? `The application dispatches this to ${action.toLowerCase()} automatically and flags the priority because urgency scored high.`
      : `The application dispatches this to ${action.toLowerCase()} automatically.`,
    facts,
  };
}
