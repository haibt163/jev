import { NOUL_TRUE_THRESHOLD } from "../../core/constants.ts";
import type {
  AnalyzeErrorCode,
  ChoiceJudgment,
  LabeledChoice,
  NoulJudgment,
  ScoreJudgment,
  UsageInfo,
} from "../../core/types.ts";
import { MAX_URGENCY_LEVEL } from "./catalog.ts";
import type { RouterState } from "./questions.ts";

/** The full normalized judgment for the support-router use case. */
export type DecisionProfile = {
  intent: LabeledChoice;
  action: LabeledChoice;
  urgency: ScoreJudgment & { max: number };
  humanEscalation: NoulJudgment & { flagged: boolean };
  ambiguity: NoulJudgment & { flagged: boolean };
  warnings: string[];
};

export type AnalyzeSuccess = {
  ok: true;
  latencyMs: number;
  model: string | null;
  requestId: string | null;
  usage: UsageInfo | null;
  state: RouterState;
  questions: unknown;
  rawAnswers: unknown;
  profile: DecisionProfile;
};

export type AnalyzeFailure = {
  ok: false;
  code: AnalyzeErrorCode;
  message: string;
  detail: string;
  latencyMs?: number;
  model?: string | null;
  requestId?: string | null;
  rawAnswers?: unknown;
};

export type AnalyzeResponse = AnalyzeSuccess | AnalyzeFailure;

/** Application thresholds for this use case \u2014 Jev judges, the app decides. */
export const SUPPORT_THRESHOLDS = {
  noulTrueThreshold: NOUL_TRUE_THRESHOLD,
  confidentEnoughToAct: 0.7,
  confirmAboveConfidence: 0.85,
} as const;

export type { ChoiceJudgment, ScoreJudgment, NoulJudgment, LabeledChoice };
export { MAX_URGENCY_LEVEL };
