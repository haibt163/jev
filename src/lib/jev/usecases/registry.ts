import { JEV_MODEL } from "../core/constants.ts";
import type {
  BatchResult,
  EvaluateFailure,
  JudgmentResult,
  UseCaseDef,
  UseCaseSummary,
} from "../core/types.ts";
import { evaluate } from "../core/typesafe.server.ts";
import { supportRouter } from "./support-router/index.ts";
import { compareChoose } from "./compare-choose/index.ts";
import { contentTriage } from "./content-triage/index.ts";

/**
 * The use-case registry. Each entry owns its state builder, questions,
 * normalization, thresholds, and presentation. The TypeSafe SDK boundary
 * lives only in `core/typesafe.server.ts`; use cases never touch it.
 */
const REGISTRY: Record<string, UseCaseDef<unknown, unknown, unknown>> = {
  [supportRouter.id]: supportRouter as UseCaseDef<unknown, unknown, unknown>,
  [compareChoose.id]: compareChoose as UseCaseDef<unknown, unknown, unknown>,
  [contentTriage.id]: contentTriage as UseCaseDef<unknown, unknown, unknown>,
};

export function getUseCase(id: string): UseCaseDef<unknown, unknown, unknown> | undefined {
  return REGISTRY[id];
}

export function listUseCases(): UseCaseSummary[] {
  return Object.values(REGISTRY).map((useCase) => ({
    id: useCase.id,
    title: useCase.title,
    shortDescription: useCase.shortDescription,
    presentation: useCase.presentation,
    batchable: useCase.batchable,
    examples: useCase.examples,
  }));
}

/**
 * Runs one use case end-to-end for a single input:
 * validate -> build state -> evaluate (core) -> normalize.
 */
export async function runUseCase(
  id: string,
  input: unknown,
): Promise<JudgmentResult<unknown> | EvaluateFailure> {
  const useCase = getUseCase(id);
  if (!useCase) {
    return {
      ok: false,
      code: "invalid_input",
      message: `Unknown use case "${id}".`,
      detail: `Supported use cases: ${Object.keys(REGISTRY).join(", ")}.`,
    };
  }

  const inputError = useCase.validateInput(input);
  if (inputError) {
    return {
      ok: false,
      code: "invalid_input",
      message: inputError,
      detail: "The request input failed use-case validation.",
    };
  }

  const state = useCase.buildState(input);
  const raw = await evaluate(state, useCase.questions, useCase.model);
  if (!raw.ok) return raw;

  const judgment = useCase.normalize(raw.rawAnswers, input);
  if (typeof judgment === "string") {
    return {
      ok: false,
      code: "invalid_response",
      message: "Jev returned an answer we could not interpret.",
      detail: judgment,
      latencyMs: raw.latencyMs,
      model: raw.model,
      requestId: raw.requestId,
      rawAnswers: raw.rawAnswers,
    };
  }

  return { ...raw, judgment };
}

/**
 * Batch evaluation: the same pipeline run independently over every item,
 * in parallel. Each item carries its own success/failure so one bad input
 * never poisons the batch.
 */
export async function runUseCaseBatch(
  id: string,
  inputs: unknown[],
): Promise<BatchResult<unknown> | EvaluateFailure> {
  const results = await Promise.all(inputs.map((input) => runUseCase(id, input)));
  const model =
    results.find((r): r is JudgmentResult<unknown> => r.ok)?.model ?? null;

  return {
    ok: true,
    useCaseId: id,
    model,
    results,
  };
}

export { JEV_MODEL };
