# Jev Playground

A TypeSafe System One playground: give Jev a messy real-world input and it
turns it into fast, typed judgments that application code can use.

Jev is TypeSafe's flagship [System One](https://docs.typesafe.ai/concepts/system-one)
model. It answers narrow, typed questions — **Choice**, **Score**, and
**Noul** — with calibrated probabilities. It does not generate prose and it
does not decide workflows. This playground demonstrates the division of
labor: **Jev judges; this application decides.**

## Use cases

| Use case | What Jev judges | What the application decides |
| --- | --- | --- |
| **Support Router** | Intent category, recommended handler (Choice), urgency (Score), human-escalation and ambiguity (Noul) | Which queue receives the request, when to flag review, when to ask for clarification |
| **Compare & Choose** | One candidate per call: request-derived Score criteria plus a "description too sparse" Noul | The generated weighted composite, ranking order, shortlist vs. needs-info verdicts |
| **Content Triage** | Category (Choice), priority (Score), review-needed (Noul) | Reply / forward-to-support / archive / flag-for-review routing, batch sort and filters |

Each use case is a self-contained module in `src/lib/jev/usecases/` that
declares its state builder, questions, normalization, thresholds, and
examples. The single TypeSafe SDK boundary lives in
`src/lib/jev/core/typesafe.server.ts`; use cases never touch the SDK.

## Architecture

```
input → buildState → TypeSafe evaluate (core) → normalize → application rules → presentation
```

- `src/lib/jev/core/` — shared judgment types, parse/normalize primitives,
  the generic `evaluate()` server function, formatting.
- `src/lib/jev/usecases/registry.ts` — the pipeline orchestrator
  (`runUseCase`, `runUseCaseBatch`) and use-case lookup.
- `src/lib/jev/usecases/<name>/` — per use case: `catalog.ts` (data),
  `questions.ts` (state + Jev questions), `normalize.ts` (typed judgments),
  `rules.ts` (deterministic workflow), `index.ts` (UseCaseDef). Compare & Choose
  derives its Score question schema from the user's request before evaluation.
- `src/routes/api/analyze.ts` — one endpoint: `GET` returns connection status
  and the registry summary; `POST` evaluates `{ useCaseId, input }` or a
  batch `{ useCaseId, batch: [...] }`.
- `src/components/playground.tsx` — the workbench; per-use-case input and
  result components; `developer-panel.tsx` exposes the full pipeline.

See [docs/architecture.md](docs/architecture.md) for details.

## Probability semantics

- A **Choice** answer reports a probability for every option; `confidence`
  summarizes how concentrated that distribution is.
- A **Score** answer reports a position on an ordered rubric (it may fall
  between levels), plus per-level probabilities and confidence.
- A **Noul** answer reports the probability that a yes/no condition is true;
  it carries no separate confidence value.

Probabilities guide workflow; they do not guarantee truth. Thresholds
(e.g. "flag review when the escalation noul ≥ 0.5") are application values
in `rules.ts`, never model settings.

## Batch evaluation

Content Triage supports batches: toggle **Batch**, enter one message per
line (limit 20), and the server runs the same pipeline per item in
parallel. Each item carries its own success/failure, so one bad input never
poisons the batch. Results are sortable by priority and filterable to
review-needed items.

Compare & Choose fans out one request per candidate in parallel and ranks
by a weighted composite that application code computes from the normalized
Score judgments — deliberately not a "Jev best product" score.

## Local setup

```sh
npm install
cp .env.example .env.local   # then set TYPESAFE_API_KEY in that file
npm run dev                  # http://localhost:8080
```

`TYPESAFE_API_KEY` is read server-side only, at call time, and is never
sent to the browser, logs, or source control.

## Vercel deployment

1. Import the repository into Vercel.
2. Project Settings → Environment Variables → add `TYPESAFE_API_KEY`
   (Preview and/or Production).
3. Redeploy after adding or changing the variable.

## Developer view

Toggle **Developer view** in the header to inspect, per evaluation:

- the exact state and questions sent to Jev
- the raw Jev assessment
- the normalized typed judgment and application thresholds
- model, request ID, TypeSafe latency, total latency, token usage
- error classification on failures

Each block has a copy-to-clipboard control. Secrets never appear here.

## Testing

```sh
npm run typecheck   # tsc --noEmit
npm run lint        # eslint
npm run test        # node:test over core + per-use-case normalization/rules
npm run build       # production build
```

Tests are deterministic and require no API credentials: they cover the
parse layer (Choice/Score/Noul), each use case's normalization and
application rules, threshold behavior, and malformed/partial responses
through a mocked answer boundary.

## Limitations

- Jev evaluates text states only (no images/audio/video).
- Jev's primary training language is English; other languages have lower
  accuracy.
- Probabilities are calibrated across prediction groups, not guarantees for
  any single answer.
- This playground is a demo instrument: it keeps no database and stores no
  history beyond session statistics in `sessionStorage`.
- The environment that produced this branch could not delete superseded
  files, so a few forwarder shims remain under `src/lib/jev/` and
  `src/components/` (marked "do not import"); they are inert and safe to
  delete in a follow-up.
