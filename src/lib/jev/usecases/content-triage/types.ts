import { NOUL_TRUE_THRESHOLD } from "../../core/constants.ts";
import type {
  LabeledChoice,
  NoulJudgment,
  ScoreJudgment,
  Thresholds,
} from "../../core/types.ts";

export const MAX_PRIORITY_LEVEL = 3;

/** The full normalized judgment for the content-triage use case. */
export type TriageJudgment = {
  category: LabeledChoice;
  priority: ScoreJudgment & { max: number };
  reviewNeeded: NoulJudgment & { flagged: boolean };
  warnings: string[];
};

/** Application thresholds for this use case \u2014 Jev judges, the app decides. */
export const TRIAGE_THRESHOLDS: Thresholds = {
  noulTrueThreshold: NOUL_TRUE_THRESHOLD,
  confidentEnoughToAct: 0.7,
  confirmAboveConfidence: 0.85,
};
