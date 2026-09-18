import { COMPARE_THRESHOLDS } from "./types.ts";
import type { CandidateJudgment, CriterionId } from "./types.ts";

export type CandidateVerdict = {
  /** Application-determined next step for this candidate. */
  action: "shortlist" | "compare" | "needs_info";
  explanation: string;
  /** The strongest and weakest dimensions, by normalized score. */
  strongest: CriterionId;
  weakest: CriterionId;
};

/**
 * Deterministic read of the typed judgments. Candidates with sparse
 * descriptions are held for more info instead of being ranked.
 */
export function deriveCandidateVerdict(candidate: CandidateJudgment): CandidateVerdict {
  const entries = Object.entries(candidate.normalized) as Array<[CriterionId, number]>;
  const strongest = entries.reduce((a, b) => (b[1] > a[1] ? b : a))[0];
  const weakest = entries.reduce((a, b) => (b[1] < a[1] ? b : a))[0];

  if (candidate.needsInfo.noul >= COMPARE_THRESHOLDS.noulTrueThreshold) {
    return {
      action: "needs_info",
      explanation:
        "The description is too sparse to judge reliably; the application holds this candidate for more detail instead of ranking it.",
      strongest,
      weakest,
    };
  }

  if (
    candidate.confidence != null &&
    candidate.confidence >= COMPARE_THRESHOLDS.confidentEnoughToAct
  ) {
    return {
      action: "shortlist",
      explanation:
        "Jev's judgments were concentrated enough that the application shortlists this candidate on the weighted composite.",
      strongest,
      weakest,
    };
  }

  return {
    action: "compare",
    explanation:
      "Judgments are usable but spread; the application keeps this candidate in the comparison without auto-shortlisting.",
    strongest,
    weakest,
  };
}
