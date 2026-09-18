import type { RouterState } from "./questions.ts";

export type AnalyzeErrorCode =
  | "missing_api_key"
  | "invalid_input"
  | "typesafe_error"
  | "timeout"
  | "network"
  | "invalid_response";

export type ChoiceJudgment = {
  type: "choice";
  choice: string;
  probabilities: Record<string, number>;
  confidence: number | null;
};

export type ScoreJudgment = {
  type: "score";
  score: number;
  probabilities: Record<string, number>;
  legend: Record<string, string>;
  confidence: number | null;
};

export type NoulJudgment = {
  type: "noul";
  noul: number;
};

export type LabeledChoice = ChoiceJudgment & {
  label: string;
  known: boolean;
};

export type DecisionProfile = {
  intent: LabeledChoice;
  action: LabeledChoice;
  urgency: ScoreJudgment & { max: number };
  humanEscalation: NoulJudgment & { flagged: boolean };
  ambiguity: NoulJudgment & { flagged: boolean };
  warnings: string[];
};

export type UsageInfo = {
  input_tokens: number;
  output_tokens: number;
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

export const JEV_UNAVAILABLE = "Jev evaluation unavailable.";
