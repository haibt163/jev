import type { NoulJudgment, ScoreJudgment, Thresholds } from "../../core/types.ts";

export type { ScoreJudgment };

export type CriterionId = string;

export const MAX_CRITERION_LEVEL = 3;

export type CriterionDefinition = {
  id: CriterionId;
  label: string;
  weight: number;
};

export type CandidateJudgment = {
  name: string;
  description: string;
  criteria: CriterionDefinition[];
  scores: Record<CriterionId, ScoreJudgment>;
  normalized: Record<CriterionId, number>;
  composite: number;
  needsInfo: NoulJudgment;
  confidence: number | null;
  warnings: string[];
};

export type ComparisonJudgment = CandidateJudgment;

export const COMPARE_THRESHOLDS: Thresholds = {
  noulTrueThreshold: 0.5,
  confidentEnoughToAct: 0.55,
  confirmAboveConfidence: 0.7,
};

export type CandidateVerdict = {
  action: "shortlist" | "compare" | "needs_info";
  explanation: string;
  strongest: CriterionId;
  weakest: CriterionId;
};
