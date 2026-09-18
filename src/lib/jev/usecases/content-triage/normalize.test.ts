import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { TRIAGE_THRESHOLDS } from "./types.ts";
import { composeTriageJudgment } from "./normalize.ts";
import { deriveTriageWorkflow } from "./rules.ts";

function choice(selected: string) {
  return {
    type: "choice",
    choice: selected,
    confidence: 0.9,
    probabilities: { [selected]: 1, other: 0 },
  };
}

function score(value: number) {
  return {
    type: "score",
    score: value,
    confidence: 0.8,
    legend: { "0": "a", "1": "b", "2": "c", "3": "d" },
    probabilities: { "0": 0, "1": 0, "2": 0, "3": 0, [String(value)]: 1 },
  };
}

function noul(value: number) {
  return { type: "noul", noul: value };
}

function validAnswers(overrides: Record<string, unknown> = {}) {
  return {
    category: choice("question"),
    priority: score(1),
    review_needed: noul(0.1),
    ...overrides,
  };
}

describe("composeTriageJudgment", () => {
  it("labels known categories and flags review above the threshold", () => {
    const result = composeTriageJudgment(validAnswers(), TRIAGE_THRESHOLDS.noulTrueThreshold);
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.judgment.category.known, true);
    assert.equal(result.judgment.category.label, "Question");
    assert.equal(result.judgment.reviewNeeded.flagged, false);
    assert.equal(result.judgment.priority.max, 3);
  });

  it("warns on an unknown category instead of failing", () => {
    const result = composeTriageJudgment(
      validAnswers({
        category: {
          type: "choice",
          choice: "vibes",
          confidence: 0.3,
          probabilities: { vibes: 1 },
        },
      }),
      TRIAGE_THRESHOLDS.noulTrueThreshold,
    );
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.judgment.category.known, false);
    assert.equal(result.judgment.warnings.length, 1);
  });

  it("rejects a malformed priority", () => {
    const result = composeTriageJudgment(
      validAnswers({ priority: { type: "score", score: "high" } }),
      TRIAGE_THRESHOLDS.noulTrueThreshold,
    );
    assert.equal(result.ok, false);
  });
});

describe("deriveTriageWorkflow", () => {
  function judgmentFor(overrides: Record<string, unknown>) {
    const result = composeTriageJudgment(
      validAnswers(overrides),
      TRIAGE_THRESHOLDS.noulTrueThreshold,
    );
    if (!result.ok) throw new Error(result.error);
    return result.judgment;
  }

  it("flags review when the noul crosses the application threshold", () => {
    const workflow = deriveTriageWorkflow(
      judgmentFor({ review_needed: noul(0.9) }),
    );
    assert.equal(workflow.action, "flag_review");
    assert.match(workflow.explanation, /person/);
  });

  it("archives spam without review", () => {
    const workflow = deriveTriageWorkflow(judgmentFor({ category: choice("spam") }));
    assert.equal(workflow.action, "archive");
  });

  it("forwards support categories to the support queue", () => {
    const bug = deriveTriageWorkflow(judgmentFor({ category: choice("bug_report") }));
    const billing = deriveTriageWorkflow(judgmentFor({ category: choice("billing_issue") }));
    assert.equal(bug.action, "forward_support");
    assert.equal(billing.action, "forward_support");
  });

  it("replies to ordinary questions", () => {
    const workflow = deriveTriageWorkflow(judgmentFor({}));
    assert.equal(workflow.action, "reply");
  });

  it("describes urgent priority in facts for support routing", () => {
    const workflow = deriveTriageWorkflow(
      judgmentFor({ category: choice("bug_report"), priority: score(3) }),
    );
    assert.equal(workflow.action, "forward_support");
    assert.equal(
      workflow.facts.some((fact) => fact.startsWith("Priority: urgent")),
      true,
    );
  });
});
