# OMP 2.0 Agent Execution Contract

This is the canonical shape for Jev task briefs.

## Required brief

```text
GOAL
<one sentence describing the observable outcome>

ROLE
<canonical OMP role>
<authority and expected stance>

REPOSITORY
<absolute or workspace-relative repository root>

BASE SHA
<commit SHA or exact base reference>

SCOPE
<exact task boundary>

WRITABLE PATHS
<explicit allowlist>

READ-ONLY PATHS
<paths that may be inspected but not modified>

CONTEXT
<relevant architecture, settled decisions, known constraints, and required references>

ACCEPTANCE
<observable conditions, one per line>

VERIFY
<exact commands, fixtures, runtime checks, and expected evidence>

GIT POLICY
<commit / push / merge permissions for this task>

TIMEBOX
<rough investigation and execution cap>

FORBIDDEN
<actions that are explicitly disallowed>

REPORT
<PASS | ISSUES | BLOCKED>
<changed files>
<verification actually executed>
<remaining risks>
<next action, if any>
```

## Implementation behavior

When acting as an implementer:

1. Read the declared context.
2. Establish the repository and target files.
3. Inspect the minimum necessary surrounding code.
4. Make the requested change.
5. Run the verification named in the brief.
6. Inspect the final diff.
7. Report only what was actually done and verified.

Do not:

- perform a broad repository audit unless assigned;
- wait for perfect information when a safe reversible interpretation is available;
- invent missing commands, files, APIs, or test results;
- modify unrelated files;
- spawn additional agents unless explicitly assigned the coordinator role;
- claim completion without evidence.

## Ambiguity rule

Classify uncertainty before escalating:

```
OBSERVABLE FACT
    → inspect / run command

TECHNICAL ASSUMPTION
    → choose safest reversible interpretation
    → record it in the report

PRODUCT PREFERENCE
    → root / Project Owner decision

IRREVERSIBLE ACTION
    → explicit authorization required
```

A technical unknown is not automatically a reason to stop.

## Review behavior

A reviewer receives a frozen implementation and should:

- compare actual files to acceptance criteria;
- inspect the diff;
- execute critical verification;
- distinguish implementation defects from environment/test defects;
- report concrete evidence.

The reviewer must not steer the implementation toward a preferred conclusion before examining evidence.

## Handoff rule

A completed child result is not automatically accepted.

The root coordinator owns:

- artifact acceptance;
- integrated verification;
- final status;
- user communication;
- merge authorization.
