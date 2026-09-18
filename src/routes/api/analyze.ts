import { createFileRoute } from "@tanstack/react-router";
import { MAX_BATCH_SIZE } from "@/lib/jev/core/constants";
import { getJevConnection } from "@/lib/jev/core/typesafe.server";
import { listUseCases, runUseCase, runUseCaseBatch } from "@/lib/jev/usecases/registry";
import type { EvaluateFailure } from "@/lib/jev/core/types";

/**
 * GET returns connection status and the use-case registry summary.
 * POST evaluates one input ({ useCaseId, input }) or a batch
 * ({ useCaseId, batch: [...] }) through the same use-case pipeline.
 */
export const Route = createFileRoute("/api/analyze")({
  server: {
    handlers: {
      GET: async () => {
        return Response.json({
          connection: getJevConnection(),
          useCases: listUseCases(),
        });
      },
      POST: async ({ request }) => {
        try {
          let body: unknown;
          try {
            body = await request.json();
          } catch {
            return jsonFailure(
              { ok: false, code: "invalid_input", message: "Enter a message to analyze.", detail: "Request body must be JSON." },
              400,
            );
          }
          if (typeof body !== "object" || body == null) {
            return jsonFailure(
              { ok: false, code: "invalid_input", message: "Enter a message to analyze.", detail: "Request body must be an object." },
              400,
            );
          }

          const record = body as Record<string, unknown>;
          const useCaseId = typeof record.useCaseId === "string" ? record.useCaseId : "";

          if (Array.isArray(record.batch)) {
            if (record.batch.length === 0) {
              return jsonFailure(
                { ok: false, code: "invalid_input", message: "The batch is empty.", detail: "Provide at least one item." },
                400,
              );
            }
            if (record.batch.length > MAX_BATCH_SIZE) {
              return jsonFailure(
                {
                  ok: false,
                  code: "batch_size_exceeded",
                  message: `Too many items: the batch limit is ${MAX_BATCH_SIZE}.`,
                  detail: `Received ${record.batch.length} items.`,
                },
                400,
              );
            }
            const result = await runUseCaseBatch(useCaseId, record.batch);
            if (!result.ok) return jsonFailure(result, statusFor(result));
            return Response.json(result, { status: 200 });
          }

          const result = await runUseCase(useCaseId, record.input);
          if (!result.ok) return jsonFailure(result, statusFor(result));
          return Response.json({ ...result, useCaseId }, { status: 200 });
        } catch {
          return Response.json(
            {
              ok: false,
              code: "typesafe_error",
              message: "Jev evaluation unavailable.",
              detail: "The analysis endpoint failed unexpectedly.",
            },
            { status: 500 },
          );
        }
      },
    },
  },
});

function statusFor(failure: EvaluateFailure): number {
  switch (failure.code) {
    case "invalid_input":
    case "batch_size_exceeded":
      return 400;
    case "missing_api_key":
      return 503;
    case "timeout":
    case "network":
      return 504;
    default:
      return 502;
  }
}

function jsonFailure(failure: EvaluateFailure, status: number): Response {
  return Response.json(failure, { status });
}
