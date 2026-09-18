import {
  APIConnectionError,
  APIError,
  APITimeoutError,
  AuthenticationError,
  RateLimitError,
  TypeSafeClient,
  TypeSafeError,
  UnprocessableEntityError,
  type Logger,
} from "@typesafe-ai/sdk";
import { env } from "@/lib/env.server.ts";
import { JEV_MODEL, JEV_UNAVAILABLE } from "./constants.ts";
import type { AnalyzeErrorCode, EvaluateFailure, RawEvaluation, UsageInfo } from "./types.ts";

if (typeof document !== "undefined") {
  throw new Error("TypeSafe integration is server-only.");
}

const REQUEST_TIMEOUT_MS = 25_000;
const API_KEY_NAME = "TYPESAFE_API_KEY";

/**
 * Read the server-only TypeSafe key at call time.
 * Dynamic lookup so Vite cannot inline an empty value at build.
 * Never log, return, or send this value to the client.
 */
function apiKey(): string | undefined {
  return env(API_KEY_NAME);
}

export function isTypesafeConfigured(): boolean {
  return Boolean(apiKey());
}

export function getJevConnection(): {
  configured: boolean;
  status: "connected" | "missing_key";
} {
  const configured = isTypesafeConfigured();
  return {
    configured,
    status: configured ? "connected" : "missing_key",
  };
}

const safeLogger: Logger = {
  debug() {},
  info() {},
  warn() {},
  error() {
    console.error("TypeSafe request failed");
  },
};

function createClient(secret: string): TypeSafeClient {
  return new TypeSafeClient({
    apiKey: secret,
    timeout: REQUEST_TIMEOUT_MS,
    logLevel: "error",
    dangerouslyAllowBrowser: false,
    logger: safeLogger,
  });
}

function redact(text: string, secret: string | undefined): string {
  if (!secret || secret.length < 4) return text;
  return text.split(secret).join("[redacted]");
}

function failure(
  code: AnalyzeErrorCode,
  detail: string,
  extra: Partial<EvaluateFailure> = {},
): EvaluateFailure {
  return {
    ok: false,
    code,
    message: JEV_UNAVAILABLE,
    detail,
    ...extra,
  };
}

function usageFrom(value: unknown): UsageInfo | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  if (
    typeof record.input_tokens !== "number" ||
    typeof record.output_tokens !== "number"
  ) {
    return null;
  }
  return {
    input_tokens: record.input_tokens,
    output_tokens: record.output_tokens,
  };
}

function mapSdkError(err: unknown, secret: string | undefined): EvaluateFailure {
  if (err instanceof APITimeoutError) {
    return failure("timeout", "The TypeSafe request timed out.");
  }
  if (err instanceof APIConnectionError) {
    return failure("network", "Could not reach the TypeSafe API.");
  }
  if (err instanceof AuthenticationError) {
    return failure(
      "typesafe_error",
      "TypeSafe authentication failed. Check TYPESAFE_API_KEY.",
    );
  }
  if (err instanceof RateLimitError) {
    return failure("typesafe_error", "TypeSafe rate limit exceeded. Try again shortly.");
  }
  if (err instanceof UnprocessableEntityError) {
    return failure(
      "typesafe_error",
      "TypeSafe rejected the request as unprocessable.",
    );
  }
  if (err instanceof APIError) {
    return failure(
      "typesafe_error",
      `TypeSafe API returned HTTP ${err.status}.`,
    );
  }
  if (err instanceof TypeSafeError) {
    return failure(
      "typesafe_error",
      redact(err.message || "TypeSafe SDK error.", secret),
    );
  }
  const message = err instanceof Error ? err.message : "Unexpected server error.";
  return failure("typesafe_error", redact(message, secret));
}

/**
 * The single TypeSafe boundary for every use case.
 *
 * Sends one `systemOne` request with the given state, questions, and model,
 * and returns raw typed answers plus request metadata. Normalization and
 * application rules live in the use-case modules, never here.
 */
export async function evaluate(
  state: unknown,
  questions: unknown,
  model: string = JEV_MODEL,
): Promise<RawEvaluation | EvaluateFailure> {
  if (state == null || typeof state !== "object") {
    return failure("invalid_input", "The evaluation state must be an object.");
  }
  if (questions == null || typeof questions !== "object") {
    return failure("invalid_input", "The evaluation questions must be an object.");
  }

  const secret = apiKey();
  if (!secret) {
    return failure("missing_api_key", "TYPESAFE_API_KEY is not configured on the server.");
  }

  const started = Date.now();
  try {
    const client = createClient(secret);
    const { data, requestId } = await client
      .systemOne(
        { state, model, questions } as Parameters<typeof client.systemOne>[0],
        { timeout: REQUEST_TIMEOUT_MS },
      )
      .withResponse();

    const latencyMs = Date.now() - started;
    const answeredModel =
      typeof data.model === "string" && data.model ? data.model : null;
    const usage = usageFrom(data.usage);

    return {
      ok: true,
      latencyMs,
      model: answeredModel,
      requestId: requestId ?? null,
      usage,
      state,
      questions,
      rawAnswers: data.answers,
    };
  } catch (err) {
    const latencyMs = Date.now() - started;
    console.error("TypeSafe request failed", {
      name: err instanceof Error ? err.name : "unknown",
    });
    return { ...mapSdkError(err, secret), latencyMs };
  }
}
