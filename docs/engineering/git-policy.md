# Jev Git Policy for OMP 2.0

## Branching

Application or engineering changes begin from current `main` unless a task explicitly names another base.

Use a dedicated branch for each coherent task.

Example:

```text
chore/omp-2-governance
fix/mobile-regression
feat/example-change
```

## Commit rules

A commit is an implementation artifact, not proof of correctness.

Before creating a commit:

- inspect `git status --short`;
- inspect `git diff`;
- verify only intended files changed;
- run the task's required checks;
- report the exact verification performed.

Prefer focused commits with messages describing the actual change.

## Push and merge

By default:

- OMP may create a task branch;
- OMP may create a focused commit when authorized by the task contract;
- OMP must not merge to `main`;
- OMP must not treat a successful commit as approval to integrate.

The Project Owner controls final approval to merge to `main`.

## PR handoff

A completed implementation should hand off:

```text
branch
base SHA
head SHA
changed files
verification evidence
remaining risks
PR URL
```

The Chief Engineer reviews the evidence and diff before recommending approval.

The Project Owner then approves or rejects the PR.

## Governance changes

Changes to this OMP 2.0 governance contract must themselves use the normal review path.

No model may silently weaken governance by editing its own rules as part of an unrelated implementation task.

