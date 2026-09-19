# OMP 2.0 Provider Routing

## Separation of concerns

Jev treats the following as separate layers:

```
OMP 2.0
  ↓
Codex Router
  ↓
provider / API
  ↓
model
```

### OMP 2.0

Owns:

- workflow;
- roles;
- task contracts;
- agent lifecycle;
- scope;
- verification;
- handoffs.

OMP is the harness, not the model provider.

### Codex Router

Owns:

- provider connectivity;
- credentials;
- model routing;
- endpoint adaptation;
- fallback behavior;
- provider-specific transport details.

The router is infrastructure, not the project manager.

### Models

Models perform:

- reasoning;
- coding;
- analysis;
- specialized review;
- research.

Model identity is an experimental variable unless explicitly fixed for a task.

## Default provider lanes

### Primary coding lane

```text
OMP 2.0
  ↓
Codex Router
  ↓
OpenCode Go API
  ↓
selected Go models
```

This lane is the default for normal development because the OpenCode Go subscription is intended to provide access to a curated group of coding models.

### Direct OpenAI lane

```text
OMP 2.0
  ↓
Codex Router
  ↓
OpenAI API
```

Use when an authorized credit grant is available or when a task deliberately requires an OpenAI model.

### Direct Anthropic lane

```text
OMP 2.0
  ↓
Codex Router
  ↓
Anthropic API
```

Use when an authorized credit grant is available or when a task deliberately requires an Anthropic model.

### OpenRouter lane

```text
OMP 2.0
  ↓
Codex Router
  ↓
OpenRouter
  ↓
selected low-cost models
```

OpenRouter remains an experimental / cost-constrained lane rather than the default production coding route.

The current preference is to use selected DeepSeek and GLM models rather than treating the free-model pool as the primary engineering path.

## Direct OpenCode Go API principle

OMP does not need to run the OpenCode CLI merely to use OpenCode Go.

The preferred architecture is:

```text
OMP 2.0 → Codex Router → OpenCode Go API
```

rather than:

```text
OMP 2.0 → OpenCode CLI → OpenCode Go
```

The CLI may still be useful as a separate developer tool, but it is not a required hop in the OMP provider path.

Codex Router remains in the middle because it preserves one provider abstraction for OpenCode Go, OpenAI, Anthropic, OpenRouter, and future providers.

## Provider-independent acceptance

A task's correctness criteria must not change because the provider changed.

For model experiments:

- keep the repository and base SHA fixed;
- keep the task contract fixed;
- keep acceptance criteria fixed;
- record resolved model and provider metadata;
- compare outcomes only after verifying the actual artifacts.

The harness is the controlled variable only when the experiment explicitly says so; otherwise the harness remains fixed.
