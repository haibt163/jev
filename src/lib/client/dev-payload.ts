import type {
  EvaluateFailure,
  JudgmentResult,
  Thresholds,
} from "@/lib/jev/core/types";

export type DevPayload = {
  useCaseId: string;
  state: unknown;
  questions: unknown;
  rawAnswers: unknown;
  judgment: unknown;
  thresholds: Thresholds | null;
  telemetry: {
    totalMs: number | null;
    typesafeMs: number | null;
    model: string | null;
    requestId: string | null;
    usage: { input_tokens: number; output_tokens: number } | null;
  };
  error: { code: string; detail: string } | null;
};

/** Builds a DevPayload from a single judgment result. */
export function devPayloadFromSingle(
  useCaseId: string,
  thresholds: Thresholds | null,
  result: JudgmentResult | EvaluateFailure,
): DevPayload {
  if (result.ok) {
    return {
      useCaseId,
      state: result.state,
      questions: result.questions,
      rawAnswers: result.rawAnswers,
      judgment: result.judgment,
      thresholds,
      telemetry: {
        totalMs: result.latencyMs,
        typesafeMs: result.latencyMs,
        model: result.model,
        requestId: result.requestId,
        usage: result.usage,
      },
      error: null,
    };
  }
  return {
    useCaseId,
    state: null,
    questions: null,
    rawAnswers: result.rawAnswers ?? null,
    judgment: null,
    thresholds,
    telemetry: {
      totalMs: result.latencyMs ?? null,
      typesafeMs: result.latencyMs ?? null,
      model: result.model ?? null,
      requestId: result.requestId ?? null,
      usage: null,
    },
    error: { code: result.code, detail: result.detail },
  };
}

/** Builds a DevPayload from one item of a batch result. */
export function devPayloadFromBatchItem(
  useCaseId: string,
  thresholds: Thresholds | null,
  item: JudgmentResult | EvaluateFailure,
): DevPayload {
  return devPayloadFromSingle(useCaseId, thresholds, item);
}

