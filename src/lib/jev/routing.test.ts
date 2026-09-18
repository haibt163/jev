import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ACTION_LABELS,
  INTENT_LABELS,
  MAX_URGENCY_LEVEL,
  NOUL_TRUE_THRESHOLD,
} from "./catalog.ts";
import {
  composeProfile,
  noulIsTrue,
  parseChoice,
  parseNoul,
  parseScore,
  routeHandlerLabel,
} from "./routing.ts";

function choice(selected: string, extra: Record<string, number> = {}) {
  const probabilities = { billing: 0, other: 0, ...extra, [selected]: 1 };
  return {
    type: "choice",
    choice: selected,
    confidence: 0.9,
    probabilities,
  };
}

function score(value: number) {
  return {
    type: "score",
    score: value,
    confidence: 0.8,
    legend: {
      "0": "none",
      "1": "low",
      "2": "moderate",
      "3": "high",
      "4": "critical",
    },
    probabilities: { "0": 0, "1": 0, "2": 0, "3": 0, "4": 0, [String(Math.round(value))]: 1 },
  };
}

function noul(value: number) {
  return { type: "noul", noul: value };
}

function validAnswers(overrides: Record<string, unknown> = {}) {
  return {
    intent_category: choice("billing"),
    recommended_action: {
      type: "choice",
      choice: "billing_support",
      confidence: 0.88,
      probabilities: { billing_support: 0.88, human_review: 0.12 },
    },
    urgency: score(3),
    human_escalation: noul(0.91),
    ambiguity: noul(0.08),
    ...overrides,
  };
}

describe("category mapping", () => {
  it("maps a known intent category to its display label", () => {
    const result = composeProfile(validAnswers());
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.profile.intent.choice, "billing");
    assert.equal(result.profile.intent.label, INTENT_LABELS.billing);
    assert.equal(result.profile.intent.known, true);
  });
});

describe("action routing", () => {
  it("maps a known action to the application handler label", () => {
    assert.equal(routeHandlerLabel("billing_support"), ACTION_LABELS.billing_support);
    const result = composeProfile(validAnswers());
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.profile.action.label, "Billing Support");
    assert.equal(result.profile.action.known, true);
  });
});

describe("valid Jev responses", () => {
  it("composes a full decision profile from typed answers", () => {
    const result = composeProfile(validAnswers());
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.profile.urgency.score, 3);
    assert.equal(result.profile.urgency.max, MAX_URGENCY_LEVEL);
    assert.equal(result.profile.humanEscalation.flagged, true);
    assert.equal(result.profile.ambiguity.flagged, false);
    assert.deepEqual(result.profile.warnings, []);
  });
});

describe("missing fields", () => {
  it("rejects a missing answers object", () => {
    const result = composeProfile(undefined);
    assert.equal(result.ok, false);
  });

  it("rejects a missing intent_category", () => {
    const { intent_category: _, ...rest } = validAnswers();
    const result = composeProfile(rest);
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.match(result.error, /intent_category/);
  });

  it("rejects a choice without probabilities", () => {
    const parsed = parseChoice(
      { type: "choice", choice: "billing" },
      "intent_category",
    );
    assert.equal(typeof parsed, "string");
  });
});

describe("unknown enum values", () => {
  it("keeps the profile and warns on an unknown category", () => {
    const result = composeProfile(
      validAnswers({
        intent_category: {
          type: "choice",
          choice: "not_a_category",
          confidence: 0.4,
          probabilities: { not_a_category: 1 },
        },
      }),
    );
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.profile.intent.known, false);
    assert.equal(result.profile.intent.label, "not_a_category");
    assert.equal(result.profile.warnings.length > 0, true);
  });

  it("warns on an unknown recommended action without inventing a handler", () => {
    const result = composeProfile(
      validAnswers({
        recommended_action: {
          type: "choice",
          choice: "teleport",
          confidence: 0.2,
          probabilities: { teleport: 1 },
        },
      }),
    );
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.profile.action.known, false);
    assert.equal(routeHandlerLabel("teleport"), "teleport");
  });
});

describe("score boundaries", () => {
  it("accepts scores at 0 and max", () => {
    assert.equal(typeof parseScore(score(0), "urgency", 4), "object");
    assert.equal(typeof parseScore(score(4), "urgency", 4), "object");
  });

  it("clamps tiny floating-point overshoot", () => {
    const parsed = parseScore(score(4.0000001), "urgency", 4);
    assert.equal(typeof parsed, "object");
    if (typeof parsed === "string") return;
    assert.equal(parsed.score, 4);
  });

  it("rejects a score far outside the rubric", () => {
    const parsed = parseScore(score(9), "urgency", 4);
    assert.equal(typeof parsed, "string");
  });

  it("rejects a non-numeric score", () => {
    const parsed = parseScore(
      { type: "score", score: "high", probabilities: { "0": 1 } },
      "urgency",
      4,
    );
    assert.equal(typeof parsed, "string");
  });
});

describe("Noul booleans", () => {
  it("treats values below the threshold as false", () => {
    assert.equal(noulIsTrue(NOUL_TRUE_THRESHOLD - 0.01), false);
    const parsed = parseNoul(noul(0.49), "ambiguity");
    assert.equal(typeof parsed, "object");
    if (typeof parsed === "string") return;
    assert.equal(noulIsTrue(parsed.noul), false);
  });

  it("treats threshold and above as true", () => {
    assert.equal(noulIsTrue(NOUL_TRUE_THRESHOLD), true);
    assert.equal(noulIsTrue(0.99), true);
  });

  it("rejects a noul far outside 0–1", () => {
    const parsed = parseNoul(noul(2), "human_escalation");
    assert.equal(typeof parsed, "string");
  });
});

describe("error handling", () => {
  it("rejects the wrong primitive type", () => {
    const result = composeProfile(
      validAnswers({
        human_escalation: {
          type: "choice",
          choice: "yes",
          probabilities: { yes: 1 },
        },
      }),
    );
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.match(result.error, /Noul/);
  });

  it("does not invent a fallback profile when required fields are invalid", () => {
    const result = composeProfile({
      intent_category: { type: "choice", choice: "billing" },
    });
    assert.equal(result.ok, false);
  });
});
