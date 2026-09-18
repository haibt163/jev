import type {
  BatchResult,
  EvaluateFailure,
  JudgmentResult,
} from "@/lib/jev/core/types";

/** Loader data from the /api/analyze GET endpoint. */
export type PlaygroundConfig = {
  connection: { configured: boolean; status: "connected" | "missing_key" };
  useCases: Array<{
    id: string;
    title: string;
    shortDescription: string;
    presentation: { icon: string; primaryMetricPath: string; showReviewIndication: boolean };
    batchable: boolean;
    examples: ReadonlyArray<{ id: string; label: string; text: string }>;
  }>;
};

async function post(body: unknown, signal?: AbortSignal): Promise<Response> {
  return fetch("/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
}

/**
 * The server owns normalization; the client owns the judgment type for the
 * use case it called. The cast at this boundary is the single place the
 * wire format meets the typed judgment contract.
 */
export async function evaluateInput<TJudgment = unknown>(
  useCaseId: string,
  input: unknown,
  signal?: AbortSignal,
): Promise<(JudgmentResult<TJudgment> & { useCaseId: string }) | EvaluateFailure> {
  const response = await post({ useCaseId, input }, signal);
  return (await response.json()) as
    | (JudgmentResult<TJudgment> & { useCaseId: string })
    | EvaluateFailure;
}

export async function evaluateBatch<TJudgment = unknown>(
  useCaseId: string,
  batch: unknown[],
  signal?: AbortSignal,
): Promise<BatchResult<TJudgment> | EvaluateFailure> {
  const response = await post({ useCaseId, batch }, signal);
  return (await response.json()) as BatchResult<TJudgment> | EvaluateFailure;
}

/** Convenience: evaluate many independent inputs in parallel, item results preserved. */
export async function evaluateParallel<TJudgment = unknown>(
  useCaseId: string,
  inputs: unknown[],
  signal?: AbortSignal,
): Promise<Array<(JudgmentResult<TJudgment> & { useCaseId: string }) | EvaluateFailure>> {
  return Promise.all(
    inputs.map((input) => evaluateInput<TJudgment>(useCaseId, input, signal)),
  );
}

export type { EvaluateFailure, JudgmentResult, BatchResult };
