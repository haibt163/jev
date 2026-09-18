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
import { MAX_MESSAGE_LENGTH } from "./catalog.ts";
import { buildState, JEV_MODEL, JEV_QUESTIONS } from "./questions.ts";
import { composeProfile } from "./routing.ts";
import {
  JEV_UNAVAILABLE,
  type AnalyzeFailure,
  type AnalyzeResponse,
  type UsageInfo,
} from "./types.ts";

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
  code: AnalyzeFailure["code"],
  detail: string,
  extra: Partial<AnalyzeFailure> = {},
): AnalyzeFailure {
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

function mapSdkError(err: unknown, secret: string | undefined): AnalyzeFailure {
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

export function evaluateMessage(userMessage: unknown): Promise<AnalyzeResponse> {
  return evaluateMessageInner(userMessage);
}

async function evaluateMessageInner(userMessage: unknown): Promise<AnalyzeResponse> {
  if (typeof userMessage !== "string") {
    return {
      ok: false,
      code: "invalid_input",
      message: "Enter a message to analyze.",
      detail: "user_message must be a string.",
    };
  }

  const trimmed = userMessage.trim();
  if (!trimmed) {
    return {
      ok: false,
      code: "invalid_input",
      message: "Enter a message to analyze.",
      detail: "The message is empty.",
    };
  }
  if (trimmed.length > MAX_MESSAGE_LENGTH) {
    return {
      ok: false,
      code: "invalid_input",
      message: `Keep the message under ${MAX_MESSAGE_LENGTH} characters.`,
      detail: `Received ${trimmed.length} characters.`,
    };
  }

  const secret = apiKey();
  if (!secret) {
    return failure(
      "missing_api_key",
      "TYPESAFE_API_KEY is not configured on the server.",
    );
  }

  const state = buildState(trimmed);
  const started = Date.now();

  try {
    const client = createClient(secret);
    const { data, requestId } = await client
      .systemOne(
        {
          state,
          model: JEV_MODEL,
          questions: JEV_QUESTIONS,
        },
        { timeout: REQUEST_TIMEOUT_MS },
      )
      .withResponse();

    const latencyMs = Date.now() - started;
    const composed = composeProfile(data.answers);
    const model = typeof data.model === "string" && data.model ? data.model : null;
    const usage = usageFrom(data.usage);

    if (!composed.ok) {
      return failure("invalid_response", composed.error, {
        latencyMs,
        model,
        requestId: requestId ?? null,
        rawAnswers: data.answers,
      });
    }

    return {
      ok: true,
      latencyMs,
      model,
      requestId: requestId ?? null,
      usage,
      state,
      questions: JEV_QUESTIONS,
      rawAnswers: data.answers,
      profile: composed.profile,
    };
  } catch (err) {
    const latencyMs = Date.now() - started;
    console.error("TypeSafe request failed", {
      name: err instanceof Error ? err.name : "unknown",
    });
    return { ...mapSdkError(err, secret), latencyMs };
  }
}
