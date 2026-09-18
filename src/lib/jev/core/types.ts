/**
 * Core judgment types shared across all use cases.
 * These are the typed answers that application code works with.
 * Jev primitives map to these types; application rules operate on them.
 */

/** A Choice answer: one option selected from a known set, with a probability distribution. */
export type ChoiceJudgment = {
  type: "choice";
  choice: string;
  probabilities: Record<string, number>;
  confidence: number | null;
};

/** A Score answer: a position on an ordered rubric, with probabilities per level, a legend, and optional confidence. */
export type ScoreJudgment = {
  type: "score";
  score: number;
  probabilities: Record<string, number>;
  legend: Record<string, string>;
  confidence: number | null;
};

/** A Noul answer: the probability (0 to 1) that a yes/no condition is true. */
export type NoulJudgment = {
  type: "noul";
  noul: number;
};

/** The three primitive answer types, discriminated by `type`. */
export type Judgment = ChoiceJudgment | ScoreJudgment | NoulJudgment;

/** A choice paired with a human-readable label and a "known" flag. */
export type LabeledChoice = ChoiceJudgment & {
  label: string;
  known: boolean;
};

/** Token usage information returned by a Jev evaluation. */
export type UsageInfo = {
  input_tokens: number;
  output_tokens: number;
};

/** Generalized error codes returned by the evaluate pipeline. */
export type AnalyzeErrorCode =
  | "missing_api_key"
  | "invalid_input"
  | "typesafe_error"
  | "timeout"
  | "network"
  | "invalid_response"
  | "batch_size_exceeded";

/** A failure returned by the core evaluate function. */
export type EvaluateFailure = {
  ok: false;
  code: AnalyzeErrorCode;
  message: string;
  detail: string;
  latencyMs?: number;
  model?: string | null;
  requestId?: string | null;
  rawAnswers?: unknown;
};

/** The raw result of a single TypeSafe evaluation, before use-case normalization. */
export type RawEvaluation = {
  ok: true;
  latencyMs: number;
  model: string | null;
  requestId: string | null;
  usage: UsageInfo | null;
  state: unknown;
  questions: unknown;
  rawAnswers: unknown;
};

/** A normalized judgment alongside the raw evaluation metadata. */
export type JudgmentResult<TJudgment = unknown> = RawEvaluation & {
  judgment: TJudgment;
};

/** A result for one item in a batch evaluation. */
export type BatchItemResult<TJudgment = unknown> =
  | JudgmentResult<TJudgment>
  | EvaluateFailure;

/** A batch evaluation result: an array of per-item results. */
export type BatchResult<TJudgment = unknown> = {
  ok: true;
  useCaseId: string;
  model: string | null;
  results: BatchItemResult<TJudgment>[];
};

/** Application-level thresholds that control workflow behavior. */
export type Thresholds = {
  /** Noul values >= this are considered "true" / flagged. */
  noulTrueThreshold: number;
  /** Minimum confidence for an automatic low-risk action. */
  confidentEnoughToAct: number;
  /** Minimum confidence to act without user confirmation on higher-stakes actions. */
  confirmAboveConfidence: number;
};

/** Presentation metadata a use case supplies to the UI. */
export type PresentationMeta = {
  /** lucide-react icon name shown next to the use case title. */
  icon: string;
  /** Dot-notation path into the judgment for the headline value. */
  primaryMetricPath: string;
  /** Whether the result row carries a review-needed flag. */
  showReviewIndication: boolean;
};

/**
 * The contract every use case implements.
 *
 * Pipeline: input -> buildState -> TypeSafe evaluate (core) -> normalize ->
 * application rules -> presentation.
 *
 * TState is the shape passed to TypeSafe as `state`.
 * TInput is the parsed request-body input shape.
 * TJudgment is the normalized typed judgment application code consumes.
 */
export type UseCaseDef<TState = unknown, TInput = unknown, TJudgment = unknown> = {
  id: string;
  title: string;
  shortDescription: string;
  model: string;

  /** Validates raw request input; returns a human-readable error, or null when valid. */
  validateInput: (input: unknown) => string | null;
  /** Builds the TypeSafe state object from validated input. */
  buildState: (input: TInput) => TState;
  /** The TypeSafe questions object sent with every request for this use case. */
  questions: Record<string, unknown>;
  /** Normalizes raw Jev answers into a typed judgment, or a parse error string. */
  normalize: (rawAnswers: unknown, input: TInput) => TJudgment | string;
  /** Application-level thresholds; the values live here, not in Jev. */
  thresholds: Thresholds;
  /** Presentation metadata for the UI. */
  presentation: PresentationMeta;
  /** Whether the use case supports batch evaluation (multiple independent items). */
  batchable: boolean;
  /** Example inputs users can immediately try. */
  examples: ReadonlyArray<{ id: string; label: string; text: string }>;
};

/** Serializes a use case for the client. */
export type UseCaseSummary = {
  id: string;
  title: string;
  shortDescription: string;
  presentation: PresentationMeta;
  batchable: boolean;
  examples: ReadonlyArray<{ id: string; label: string; text: string }>;
};
