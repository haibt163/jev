import { isRecord, parseNoul, parseScore } from "../../core/parse.ts";
import {
  CRITERION_IDS,
  CRITERION_WEIGHTS,
  MAX_CRITERION_LEVEL,
  type CandidateJudgment,
  type CriterionId,
  type ScoreJudgment,
} from "./types.ts";

/**
 * Normalizes one candidate's raw answers into typed judgments and computes
 * the deterministic weighted composite in application code.
 */
export function composeCandidateJudgment(
  raw: unknown,
  inputName: string,
  inputDescription: string,
): { ok: true; judgment: CandidateJudgment } | { ok: false; error: string } {
  if (!isRecord(raw)) {
    return { ok: false, error: "Jev returned no answers object." };
  }

  const scores = {} as Record<CriterionId, ScoreJudgment>;
  const confidences: number[] = [];
  let missingConfidence = false;

  for (const id of CRITERION_IDS) {
    const parsed = parseScore(raw[id], id, MAX_CRITERION_LEVEL);
    if (typeof parsed === "string") return { ok: false, error: parsed };
    scores[id] = parsed;
    if (parsed.confidence == null) {
      missingConfidence = true;
    } else {
      confidences.push(parsed.confidence);
    }
  }

  const needsInfo = parseNoul(raw.needs_info, "needs_info");
  if (typeof needsInfo === "string") return { ok: false, error: needsInfo };

  const normalized = {} as Record<CriterionId, number>;
  let composite = 0;
  for (const id of CRITERION_IDS) {
    normalized[id] = scores[id].score / MAX_CRITERION_LEVEL;
    composite += CRITERION_WEIGHTS[id] * normalized[id];
  }

  const confidence = missingConfidence
    ? null
    : confidences.reduce((a, b) => a + b, 0) / confidences.length;

  const judgment: CandidateJudgment = {
    name: inputName,
    description: inputDescription,
    scores,
    normalized,
    composite,
    needsInfo,
    confidence,
    warnings: [],
  };

  return { ok: true, judgment };
}
