import type { NoulJudgment, ScoreJudgment, Thresholds } from "../../core/types.ts";

export type { ScoreJudgment };

/** The five comparison dimensions Jev scores each candidate on. */
export const CRITERION_IDS = [
  "portability",
  "performance",
  "battery",
  "value",
  "fit",
] as const;

export type CriterionId = (typeof CRITERION_IDS)[number];

/** Every criterion uses a 4-level rubric, so Score positions run 0\u20133. */
export const MAX_CRITERION_LEVEL = 3;

export const CRITERION_WEIGHTS: Record<CriterionId, number> = {
  portability: 0.2,
  performance: 0.3,
  battery: 0.2,
  value: 0.15,
  fit: 0.15,
};

/** Normalized judgment for one candidate across all criteria. */
export type CandidateJudgment = {
  name: string;
  description: string;
  /** One typed Score judgment per criterion. */
  scores: Record<CriterionId, ScoreJudgment>;
  /** Scores normalized onto 0\u20131 (score / max level). */
  normalized: Record<CriterionId, number>;
  /** Application-computed weighted composite on 0\u20131. Deterministic \u2014 not a Jev output. */
  composite: number;
  /** Probability that the state contained too little to judge fit. */
  needsInfo: NoulJudgment;
  /** Mean confidence across the five Score judgments. */
  confidence: number | null;
  warnings: string[];
};

/** Full judgment for the compare-choose use case: one candidate per call. */
export type ComparisonJudgment = CandidateJudgment;

/** Application thresholds for this use case. */
export const COMPARE_THRESHOLDS: Thresholds = {
  noulTrueThreshold: 0.5,
  confidentEnoughToAct: 0.55,
  confirmAboveConfidence: 0.7,
};

/** Application verdict derived deterministically from a candidate's judgments. */
export type CandidateVerdict = {
  action: "shortlist" | "compare" | "needs_info";
  explanation: string;
  strongest: CriterionId;
  weakest: CriterionId;
};
