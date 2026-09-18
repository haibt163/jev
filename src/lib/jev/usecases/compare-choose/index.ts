import { JEV_MODEL } from "../../core/constants.ts";
import type { UseCaseDef } from "../../core/types.ts";
import {
  buildCriteria,
  buildQuestions,
  buildState,
} from "./questions.ts";
import type { CandidateInput, CandidateState } from "./questions.ts";
import { composeCandidateJudgment } from "./normalize.ts";
import { COMPARE_THRESHOLDS } from "./types.ts";
import type { ComparisonJudgment } from "./types.ts";

export { buildCriteria, buildQuestions, buildState } from "./questions.ts";
export { composeCandidateJudgment } from "./normalize.ts";
export { deriveCandidateVerdict } from "./rules.ts";
export { COMPARE_THRESHOLDS, MAX_CRITERION_LEVEL } from "./types.ts";
export type {
  CandidateJudgment,
  CandidateInput,
  ComparisonJudgment,
  CriterionDefinition,
  CriterionId,
  ScoreJudgment,
} from "./types.ts";

export const COMPARE_EXAMPLES = [
  {
    id: "laptop",
    label: "Laptop for programming and travel",
    text: "I need a laptop for programming and travel.",
  },
] as const;

export const COMPARE_CANDIDATE_SETS = [
  {
    id: "laptop",
    label: "Laptops",
    request: "I need a laptop for programming and travel.",
    candidates: [
      {
        name: "Featherbook 13",
        description:
          "1.0 kg, 13-inch, fanless low-power CPU, 18h battery, $899",
      },
      {
        name: "ProDeck 16",
        description:
          "2.1 kg, 16-inch, high-wattage CPU and discrete GPU, 5h battery, $2399",
      },
      {
        name: "MidLine 14",
        description:
          "1.4 kg, 14-inch, mid-range CPU, 11h battery, $1299",
      },
    ],
  },
] as const;

function validateInput(input: unknown): string | null {
  if (typeof input !== "object" || input == null) {
    return "Provide a request, a candidate name, and a description.";
  }

  const record = input as Record<string, unknown>;
  const request =
    typeof record.request === "string" ? record.request.trim() : "";
  const name = typeof record.name === "string" ? record.name.trim() : "";
  const description =
    typeof record.description === "string" ? record.description.trim() : "";

  if (!request) return "Describe what you need.";
  if (!name) return "Name the candidate option.";
  if (!description) return "Describe the candidate option.";
  if (request.length > 4000) return "Keep the request under 4000 characters.";
  if (name.length > 200) return "Keep the candidate name under 200 characters.";
  if (description.length > 4000) {
    return "Keep the candidate description under 4000 characters.";
  }
  return null;
}

export const compareChoose: UseCaseDef<
  CandidateState,
  CandidateInput,
  ComparisonJudgment
> = {
  id: "compare-choose",
  title: "Compare & Choose",
  shortDescription:
    "Generate request-specific criteria, score each candidate against them, and compute the weighted comparison in application code.",
  model: JEV_MODEL,
  validateInput,
  buildState: (input) => buildState(input, buildCriteria(input.request)),
  questions: (state) => buildQuestions(state.comparison_criteria),
  normalize: (rawAnswers, input) => {
    const criteria = buildCriteria(input.request);
    const result = composeCandidateJudgment(
      rawAnswers,
      input.name,
      input.description,
      criteria,
    );
    return result.ok ? result.judgment : result.error;
  },
  thresholds: COMPARE_THRESHOLDS,
  presentation: {
    icon: "scale",
    primaryMetricPath: "composite",
    showReviewIndication: true,
  },
  batchable: false,
  examples: COMPARE_EXAMPLES,
};
