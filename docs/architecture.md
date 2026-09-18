# Jev Playground — Architecture

## Pipeline

Every evaluation follows the same contract:

```
input → derive criteria from need → buildState → TypeSafe evaluate (core)
      → normalize → application rules → presentation
```

- **Criteria generation**: `compare-choose/questions.ts::buildCriteria` derives
  request-specific dimensions and weights from the user's stated need. The
  generator is deterministic application code; the generated criteria are
  shared across all candidates in the comparison.
- **State builder** includes the user's request, candidate details, and generated
  criteria.
- **Question builder** creates narrow Score questions for each generated
  criterion plus a Noul for sparse candidate descriptions.
- **Core evaluation** remains behind the single SDK boundary in
  `core/typesafe.server.ts`.
- **Normalization** parses typed answers and computes the weighted composite from
  the generated criteria. The composite remains an application metric, not a
  Jev output.
- **Rules** remain deterministic and operate over normalized typed judgments.
- **Presentation** renders the generated criterion labels and weights.

## Design invariant

**Never score a candidate on an irrelevant hardcoded criterion.**

The generator currently recognizes explicit signals for budget, gift/partner
context, portability, performance, battery, durability, ethics, aesthetics,
and product quality. Unknown requests fall back to one neutral overall-fit
criterion. Matching criteria are normalized to sum to 100%.

For example, an engagement-diamond request can yield personal-fit and budget-fit
criteria when those needs are actually stated, while a laptop request with
programming and travel yields portability and performance.

## Dynamic question contract

The core use-case contract allows `questions` to be either a static question
object or a function of the generated state. Compare & Choose uses the latter:
the state carries the generated criteria, and the registry builds the matching
Score question set immediately before the TypeSafe call. This keeps the
criteria/schema aligned with the request that is actually being evaluated.

## Testing

The compare-choose suite covers request-specific criteria generation,
normalization, weighted composite math, malformed answers, confidence handling,
and workflow thresholds.
