import { isRecord, parseNoul, parseScore } from "../../core/parse.ts";
import {
  MAX_CRITERION_LEVEL,
  type CandidateJudgment,
  type CriterionDefinition,
  type CriterionId,
  type ScoreJudgment,
} from "./types.ts";

export function composeCandidateJudgment(
  raw: unknown,
  inputName: string,
  inputDescription: string,
  criteria: CriterionDefinition[],
): { ok: true; judgment: CandidateJudgment } | { ok: false; error: string } {
  if (!isRecord(raw)) {
    return { ok: false, error: "Jev returned no answers object." };
  }

  const scores: Record<CriterionId, ScoreJudgment> = {};
  const confidences: number[] = [];
  let missingConfidence = false;

  for (const criterion of criteria) {
    const parsed = parseScore(
      raw[criterion.id],
      criterion.id,
      MAX_CRITERION_LEVEL,
    );
    if (typeof parsed === "string") return { ok: false, error: parsed };
    scores[criterion.id] = parsed;
    if (parsed.confidence == null) missingConfidence = true;
    else confidences.push(parsed.confidence);
  }

  const needsInfo = parseNoul(raw.needs_info, "needs_info");
  if (typeof needsInfo === "string") return { ok: false, error: needsInfo };

  const normalized: Record<CriterionId, number> = {};
  let composite = 0;
  for (const criterion of criteria) {
    const value = scores[criterion.id].score / MAX_CRITERION_LEVEL;
    normalized[criterion.id] = value;
    composite += criterion.weight * value;
  }

  const confidence = missingConfidence
    ? null
    : confidences.reduce((a, b) => a + b, 0) / confidences.length;

  return {
    ok: true,
    judgment: {
      name: inputName,
      description: inputDescription,
      criteria,
      scores,
      normalized,
      composite,
      needsInfo,
      confidence,
      warnings: [],
    },
  };
}
