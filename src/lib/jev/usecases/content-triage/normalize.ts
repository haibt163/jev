import { isRecord, parseChoice, parseNoul, parseScore } from "../../core/parse.ts";
import { TRIAGE_CATEGORIES, TRIAGE_CATEGORY_LABELS } from "./questions.ts";
import { MAX_PRIORITY_LEVEL } from "./types.ts";
import type { TriageJudgment } from "./types.ts";

export type ComposeTriageResult =
  | { ok: true; judgment: TriageJudgment }
  | { ok: false; error: string };

export function noulIsTrue(noul: number, threshold: number): boolean {
  return noul >= threshold;
}

export function composeTriageJudgment(
  raw: unknown,
  noulThreshold: number,
): ComposeTriageResult {
  if (!isRecord(raw)) {
    return { ok: false, error: "Jev returned no answers object." };
  }

  const category = parseChoice(raw.category, "category");
  if (typeof category === "string") return { ok: false, error: category };

  const priority = parseScore(raw.priority, "priority", MAX_PRIORITY_LEVEL);
  if (typeof priority === "string") return { ok: false, error: priority };

  const reviewNeeded = parseNoul(raw.review_needed, "review_needed");
  if (typeof reviewNeeded === "string") return { ok: false, error: reviewNeeded };

  const warnings: string[] = [];
  const isKnown = (TRIAGE_CATEGORIES as readonly string[]).includes(category.choice);
  if (!isKnown) warnings.push(`Unknown category "${category.choice}".`);

  const judgment: TriageJudgment = {
    category: {
      ...category,
      label:
        (TRIAGE_CATEGORY_LABELS as Record<string, string>)[category.choice] ??
        category.choice,
      known: isKnown,
    },
    priority: { ...priority, max: MAX_PRIORITY_LEVEL },
    reviewNeeded: {
      ...reviewNeeded,
      flagged: noulIsTrue(reviewNeeded.noul, noulThreshold),
    },
    warnings,
  };

  return { ok: true, judgment };
}
