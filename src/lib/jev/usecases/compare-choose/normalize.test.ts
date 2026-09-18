import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CRITERION_IDS, CRITERION_WEIGHTS } from "./types.ts";
import { composeCandidateJudgment } from "./normalize.ts";
import { deriveCandidateVerdict } from "./rules.ts";

function rawScore(level: number, confidence = 0.9) {
  return {
    type: "score",
    score: level,
    confidence,
    legend: { "0": "a", "1": "b", "2": "c", "3": "d" },
    probabilities: {
      "0": 0,
      "1": 0,
      "2": 0,
      "3": 0,
      [String(level)]: 1,
    },
  };
}

function validAnswers() {
  const answers: Record<string, unknown> = {};
  for (const id of CRITERION_IDS) {
    answers[id] = rawScore(2);
  }
  answers.needs_info = { type: "noul", noul: 0.1 };
  return answers;
}

describe("composeCandidateJudgment", () => {
  it("normalizes every criterion onto 0-1 and computes the weighted composite", () => {
    const result = composeCandidateJudgment(validAnswers(), "Test", "desc");
    assert.equal(result.ok, true);
    if (!result.ok) return;
    for (const id of CRITERION_IDS) {
      assert.equal(result.judgment.normalized[id], 2 / 3);
    }
    const expected = CRITERION_IDS.reduce(
      (sum, id) => sum + CRITERION_WEIGHTS[id] * (2 / 3),
      0,
    );
    assert.ok(Math.abs(result.judgment.composite - expected) < 1e-9);
    assert.equal(result.judgment.confidence, 0.9);
  });

  it("weights push a top performer above a mid performer deterministically", () => {
    const strong = composeCandidateJudgment(validAnswers(), "Strong", "desc");
    const mid = composeCandidateJudgment(
      (() => {
        const answers = validAnswers();
        for (const id of CRITERION_IDS) answers[id] = rawScore(1);
        return answers;
      })(),
      "Mid",
      "desc",
    );
    assert.equal(strong.ok && mid.ok, true);
    if (!strong.ok || !mid.ok) return;
    assert.ok(strong.judgment.composite > mid.judgment.composite);
  });

  it("rejects a malformed criterion answer", () => {
    const answers = validAnswers();
    answers.portability = { type: "noul", noul: 0.5 };
    const result = composeCandidateJudgment(answers, "Test", "desc");
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.match(result.error, /portability/);
  });

  it("rejects a missing answers object", () => {
    const result = composeCandidateJudgment(undefined, "Test", "desc");
    assert.equal(result.ok, false);
  });

  it("reports null confidence when any confidence is absent", () => {
    const answers = validAnswers();
    const first = CRITERION_IDS[0];
    answers[first] = { ...rawScore(2), confidence: undefined };
    const result = composeCandidateJudgment(answers, "Test", "desc");
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.judgment.confidence, null);
  });
});

describe("deriveCandidateVerdict", () => {
  it("holds sparse candidates for more info instead of ranking them", () => {
    const result = composeCandidateJudgment(validAnswers(), "Test", "desc");
    assert.equal(result.ok, true);
    if (!result.ok) return;
    const sparse = {
      ...result.judgment,
      needsInfo: { type: "noul" as const, noul: 0.8 },
    };
    const verdict = deriveCandidateVerdict(sparse);
    assert.equal(verdict.action, "needs_info");
  });

  it("shortlists confident candidates", () => {
    const result = composeCandidateJudgment(validAnswers(), "Test", "desc");
    assert.equal(result.ok, true);
    if (!result.ok) return;
    const verdict = deriveCandidateVerdict(result.judgment);
    assert.equal(verdict.action, "shortlist");
    assert.equal(verdict.strongest in CRITERION_WEIGHTS, true);
  });

  it("keeps spread judgments in the comparison without shortlisting", () => {
    const result = composeCandidateJudgment(validAnswers(), "Test", "desc");
    assert.equal(result.ok, true);
    if (!result.ok) return;
    const spread = {
      ...result.judgment,
      confidence: 0.3,
    };
    const verdict = deriveCandidateVerdict(spread);
    assert.equal(verdict.action, "compare");
  });
});
