import { MAX_CRITERION_LEVEL, type CriterionDefinition } from "./types.ts";

export type CandidateInput = {
  request: string;
  name: string;
  description: string;
};

export type CandidateState = {
  user_request: string;
  candidate_name: string;
  candidate_description: string;
  comparison_criteria: CriterionDefinition[];
};

function buildCriteriaPrompt(criteria: CriterionDefinition[]) {
  return criteria
    .map(
      (criterion) =>
        "- " +
        criterion.label +
        " (weight " +
        Math.round(criterion.weight * 100) +
        "%): judge only how well the candidate satisfies this criterion for the stated need.",
    )
    .join("\n");
}

export function buildQuestions(criteria: CriterionDefinition[]) {
  const questions: Record<string, unknown> = {};

  for (const criterion of criteria) {
    questions[criterion.id] = {
      type: "score" as const,
      instructions:
        'How well does candidate_description satisfy the "' +
        criterion.label +
        '" criterion for user_request? Use only the stated need and candidate description. Do not invent missing facts. Generated criteria:\n' +
        buildCriteriaPrompt(criteria),
      criteria: [
        "Clearly poor against " +
          criterion.label +
          "; the candidate misses this need.",
        "Limited against " +
          criterion.label +
          "; the candidate only partly satisfies this need.",
        "Good against " +
          criterion.label +
          "; the candidate substantially satisfies this need.",
        "Excellent against " +
          criterion.label +
          "; the candidate strongly satisfies this need.",
      ],
    };
  }

  questions.needs_info = {
    type: "noul" as const,
    instructions:
      "Is candidate_description too sparse to judge the candidate reliably against the generated comparison criteria?",
    criteria: {
      true: "The description lacks facts needed for a reliable judgment.",
      false: "The description contains enough information for a usable judgment.",
    },
  };

  return questions;
}

export function buildState(
  input: CandidateInput,
  criteria: CriterionDefinition[],
): CandidateState {
  return {
    user_request: input.request,
    candidate_name: input.name,
    candidate_description: input.description,
    comparison_criteria: criteria,
  };
}

/**
 * Deterministically derives a small set of request-specific criteria.
 * Criteria are application-owned so the final schema and weighting remain
 * explicit and testable rather than being hardcoded to one product domain.
 */
export function buildCriteria(request: string): CriterionDefinition[] {
  const text = request.trim().toLowerCase();
  const criteria: CriterionDefinition[] = [];

  const push = (id: string, label: string, weight: number) => {
    if (!criteria.some((criterion) => criterion.id === id)) {
      criteria.push({ id, label, weight });
    }
  };

  if (/budget|price|afford|cost|cheap|value|spend/.test(text)) {
    push("budget_fit", "Budget fit", 0.25);
  }
  if (/gift|partner|relationship|personal|symbol|sentimental|meaning/.test(text)) {
    push("personal_fit", "Personal fit", 0.25);
  }
  if (/travel|portable|carry|light|compact/.test(text)) {
    push("portability", "Portability", 0.2);
  }
  if (/performance|programming|gaming|workload|power/.test(text)) {
    push("performance", "Performance", 0.2);
  }
  if (/battery|charging/.test(text)) {
    push("battery", "Battery life", 0.2);
  }
  if (/durab|reliab|hardness|wear|long[- ]term/.test(text)) {
    push("durability", "Durability", 0.2);
  }
  if (/ethical|sustainab|environment|origin|social/.test(text)) {
    push("ethics", "Ethical considerations", 0.2);
  }
  if (/appearance|look|style|design|aesthetic|beautiful/.test(text)) {
    push("aesthetics", "Aesthetic fit", 0.2);
  }
  if (/quality|spec|feature|capability/.test(text)) {
    push("quality", "Relevant quality", 0.2);
  }

  if (criteria.length === 0) {
    push("overall_fit", "Overall fit to the stated need", 1);
  }

  const total = criteria.reduce((sum, criterion) => sum + criterion.weight, 0);
  return criteria.map((criterion) => ({
    ...criterion,
    weight: criterion.weight / total,
  }));
}

export { MAX_CRITERION_LEVEL };
