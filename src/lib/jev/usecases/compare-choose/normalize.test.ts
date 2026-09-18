import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildCriteria } from "./questions.ts";
import { MAX_CRITERION_LEVEL } from "./types.ts";
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

function validAnswers(
  criteria = buildCriteria("I need a laptop for programming and travel."),
) {
  const answers: Record<string, unknown> = {};
  for (const criterion of criteria) {
    answers[criterion.id] = rawScore(2);
  }
  answers.needs_info = { type: "noul", noul: 0.1 };
  return answers;
}

describe("compare criteria generation", () => {
  it("derives only request-relevant laptop criteria", () => {
    const criteria = buildCriteria(
      "I need a laptop for programming and travel.",
    );
    assert.deepEqual(
      criteria.map((criterion) => criterion.id),
      ["portability", "performance"],
    );
    assert.equal(
      Math.abs(
        criteria.reduce((sum, criterion) => sum + criterion.weight, 0) - 1,
      ) < 1e-9,
      true,
    );
  });

  it("does not introduce hardware criteria for a partner gift request", () => {
    const criteria = buildCriteria(
      "I need an engagement diamond ring for my partner.",
    );
    assert.deepEqual(
      criteria.map((criterion) => criterion.id),
      ["personal_fit"],
    );
  });
});

describe("composeCandidateJudgment", () => {
  it("normalizes dynamic criteria and computes the weighted composite", () => {
    const criteria = buildCriteria(
      "I need a laptop for programming and travel.",
    );
    const result = composeCandidateJudgment(
      validAnswers(criteria),
      "Test",
      "desc",
      criteria,
    );
    assert.equal(result.ok, true);
    if (!result.ok) return;
    for (const criterion of criteria) {
      assert.equal(
        result.judgment.normalized[criterion.id],
        2 / MAX_CRITERION_LEVEL,
      );
    }
    assert.ok(Math.abs(result.judgment.composite - 2 / 3) < 1e-9);
    assert.equal(result.judgment.confidence, 0.9);
  });

  it("rejects a malformed criterion answer", () => {
    const criteria = buildCriteria(
      "I need a laptop for programming and travel.",
    );
    const answers = validAnswers(criteria);
    answers[criteria[0].id] = { type: "noul", noul: 0.5 };
    const result = composeCandidateJudgment(
      answers,
      "Test",
      "desc",
      criteria,
    );
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.match(result.error, new RegExp(criteria[0].id));
  });

  it("rejects a missing answers object", () => {
    const criteria = buildCriteria(
      "I need a laptop for programming and travel.",
    );
    const result = composeCandidateJudgment(undefined, "Test", "desc", criteria);
    assert.equal(result.ok, false);
  });

  it("reports null confidence when any confidence is absent", () => {
    const criteria = buildCriteria(
      "I need a laptop for programming and travel.",
    );
    const answers = validAnswers(criteria);
    const first = criteria[0].id;
    answers[first] = { ...rawScore(2), confidence: undefined };
    const result = composeCandidateJudgment(
      answers,
      "Test",
      "desc",
      criteria,
    );
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.judgment.confidence, null);
  });

  it("holds sparse candidates for more info", () => {
    const criteria = buildCriteria(
      "I need a laptop for programming and travel.",
    );
    const result = composeCandidateJudgment(
      validAnswers(criteria),
      "Test",
      "desc",
      criteria,
    );
    assert.equal(result.ok, true);
    if (!result.ok) return;
    const verdict = deriveCandidateVerdict({
      ...result.judgment,
      needsInfo: { type: "noul", noul: 0.8 },
    });
    assert.equal(verdict.action, "needs_info");
  });

  it("shortlists confident candidates", () => {
    const criteria = buildCriteria(
      "I need a laptop for programming and travel.",
    );
    const result = composeCandidateJudgment(
      validAnswers(criteria),
      "Test",
      "desc",
      criteria,
    );
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(deriveCandidateVerdict(result.judgment).action, "shortlist");
  });

  it("keeps spread judgments in comparison", () => {
    const criteria = buildCriteria(
      "I need a laptop for programming and travel.",
    );
    const result = composeCandidateJudgment(
      validAnswers(criteria),
      "Test",
      "desc",
      criteria,
    );
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(
      deriveCandidateVerdict({
        ...result.judgment,
        confidence: 0.3,
      }).action,
      "compare",
    );
  });
});
