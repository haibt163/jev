# Jev Playground — Architecture

## Pipeline

Every evaluation follows the same contract:

```
Use Case → State Builder → Question Set → TypeSafe/Jev Evaluation
        → Normalized Typed Judgments → Application Rules → Presentation
```

- **State builder** (`questions.ts::buildState`): turns validated user
  input into the JSON state Jev evaluates. State carries the content plus
  any known-set context (e.g. `available_categories`).
- **Question set** (`questions.ts::JEV_QUESTIONS`): narrow, typed
  questions. Choice for closed sets, Score for ordered rubrics, Noul for
  yes/no probabilities. Question IDs are for application code only; the
  model never sees them (per TypeSafe docs).
- **Evaluation** (`core/typesafe.server.ts::evaluate`): the single SDK
  boundary. One `systemOne` call per state; timeout, retries, error
  mapping (`APITimeoutError` → `timeout`, etc.), usage capture. The
  `TYPESAFE_API_KEY` is read at call time from the server environment and
  redacted from any error text.
- **Normalization** (`normalize.ts`): parses raw answers into typed
  judgments (`core/parse.ts`), tolerating structured criteria, clamping
  float overshoot, rejecting malformed shapes with per-field error
  messages. Unknown enum values warn instead of failing.
- **Application rules** (`rules.ts`): deterministic workflow. Thresholds
  live here (e.g. `noulTrueThreshold: 0.5`), producing actions
  (`route`, `route_and_flag`, `clarify`, `flag_review`, `archive`, …) and
  the user-facing explanation. Jev output is never re-written as prose by
  the model; explanations are string templates over judgment fields.
- **Presentation**: React components render primitive-aware visualizations
  (distribution bars for Choice/Score, threshold-marked tracks for Noul).

## Registry

`usecases/registry.ts` maps use-case IDs to their `UseCaseDef` and exposes
`runUseCase` / `runUseCaseBatch`. The server route (`/api/analyze`)
dispatches on `useCaseId`; `GET` serves the registry summary so the client
renders selectors and examples without importing server modules.

Batch: `runUseCaseBatch` runs the identical pipeline per item in parallel
with per-item success/failure (`MAX_BATCH_SIZE = 20`). Compare & Choose
fans one request per candidate from the client instead, because each
candidate is an independent state.

## Server/client split

- Server-only: `core/typesafe.server.ts`, `usecases/registry.ts`
  (imports the SDK boundary; throws if bundled client-side).
- Shared/pure: judgment types, `core/parse.ts`, per-use-case
  `questions.ts`/`rules.ts` (client renders questions and derives
  workflow chips from the same code the server used).
- Client: `lib/client/api.ts` (typed fetch wrapper — the single wire/typed
  judgment boundary), `components/*`.

## Error handling

Classified failures (`missing_api_key`, `invalid_input`, `timeout`,
`network`, `typesafe_error`, `invalid_response`,
`batch_size_exceeded`) map to distinct HTTP statuses (400/502/503/504) and
to user-readable copy. The developer view exposes `code` + `detail`
without credentials.

## Testing strategy

Deterministic only: `core/parse.test.ts` covers the three primitives
(valid/malformed/boundary), each use case's `normalize.test.ts` covers
normalization plus rule behavior (workflow branches, weighted composite
math, threshold crossings) against fixed answer fixtures. No network, no
credentials. The live SDK path is exercised only by real usage.
