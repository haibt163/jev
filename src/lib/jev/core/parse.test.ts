import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  meanConfidence,
  normalizeScore,
  parseChoice,
  parseNoul,
  parseScore,
} from "./parse.ts";

describe("parseChoice", () => {
  it("accepts a well-formed choice", () => {
    const parsed = parseChoice(
      {
        type: "choice",
        choice: "billing",
        confidence: 0.9,
        probabilities: { billing: 0.9, other: 0.1 },
      },
      "category",
    );
    assert.equal(typeof parsed, "object");
    if (typeof parsed === "string") return;
    assert.equal(parsed.choice, "billing");
    assert.equal(parsed.confidence, 0.9);
  });

  it("rejects the wrong primitive type", () => {
    assert.equal(
      typeof parseChoice({ type: "noul", noul: 1 }, "category"),
      "string",
    );
  });

  it("rejects a choice without probabilities", () => {
    assert.equal(
      typeof parseChoice({ type: "choice", choice: "billing" }, "category"),
      "string",
    );
  });

  it("rejects non-finite probability entries", () => {
    assert.equal(
      typeof parseChoice(
        {
          type: "choice",
          choice: "billing",
          probabilities: { billing: Number.NaN },
        },
        "category",
      ),
      "string",
    );
  });

  it("rejects a missing selected choice", () => {
    assert.equal(
      typeof parseChoice(
        { type: "choice", probabilities: { billing: 1 } },
        "category",
      ),
      "string",
    );
  });
});

describe("parseScore", () => {
  const raw = (score: number) => ({
    type: "score",
    score,
    confidence: 0.8,
    legend: { "0": "low", "1": "mid", "2": "high" },
    probabilities: { "0": 0, "1": 1, "2": 0 },
  });

  it("accepts scores at both rubric ends", () => {
    assert.equal(typeof parseScore(raw(0), "s", 2), "object");
    assert.equal(typeof parseScore(raw(2), "s", 2), "object");
  });

  it("clamps tiny floating-point overshoot", () => {
    const parsed = parseScore(raw(2.0000001), "s", 2);
    assert.equal(typeof parsed, "object");
    if (typeof parsed === "string") return;
    assert.equal(parsed.score, 2);
  });

  it("rejects a score far outside the rubric", () => {
    assert.equal(typeof parseScore(raw(9), "s", 2), "string");
  });

  it("rejects a non-numeric score", () => {
    assert.equal(
      typeof parseScore(
        { type: "score", score: "high", probabilities: { "0": 1 } },
        "s",
        2,
      ),
      "string",
    );
  });

  it("coerces structured legend entries to text", () => {
    const parsed = parseScore(
      {
        type: "score",
        score: 1,
        legend: { "1": { what: "mid level" } },
        probabilities: { "1": 1 },
      },
      "s",
      2,
    );
    assert.equal(typeof parsed, "object");
    if (typeof parsed === "string") return;
    assert.equal(parsed.legend["1"], "mid level");
  });
});

describe("parseNoul", () => {
  it("accepts probabilities across 0-1", () => {
    assert.equal(typeof parseNoul({ type: "noul", noul: 0 }, "n"), "object");
    assert.equal(typeof parseNoul({ type: "noul", noul: 1 }, "n"), "object");
  });

  it("clamps tiny overshoot and rejects gross violations", () => {
    const near = parseNoul({ type: "noul", noul: 1.01 }, "n");
    assert.equal(typeof near, "object");
    if (typeof near === "string") return;
    assert.equal(near.noul, 1);
    assert.equal(typeof parseNoul({ type: "noul", noul: 2 }, "n"), "string");
  });

  it("rejects the wrong primitive type", () => {
    assert.equal(
      typeof parseNoul({ type: "choice", choice: "x", probabilities: {} }, "n"),
      "string",
    );
  });
});

describe("normalizeScore", () => {
  it("divides by the top level and clamps", () => {
    assert.equal(normalizeScore(3, 3), 1);
    assert.equal(normalizeScore(1.5, 3), 0.5);
    assert.equal(normalizeScore(0, 3), 0);
  });

  it("guards a zero top level", () => {
    assert.equal(normalizeScore(1, 0), 0);
  });
});

describe("meanConfidence", () => {
  it("averages present values and ignores nulls", () => {
    assert.equal(meanConfidence([0.5, null, 1]), 0.75);
  });

  it("returns null when nothing is present", () => {
    assert.equal(meanConfidence([null, undefined]), null);
  });
});
