import { createFileRoute } from "@tanstack/react-router";
import { JEV_UNAVAILABLE } from "@/lib/jev/types";

export const Route = createFileRoute("/api/analyze")({
  server: {
    handlers: {
      GET: async () => {
        const { getJevConnection } = await import("@/lib/jev/typesafe.server");
        return Response.json(getJevConnection());
      },
      POST: async ({ request }) => {
        try {
          const { evaluateMessage } = await import("@/lib/jev/typesafe.server");
          let body: unknown;
          try {
            body = await request.json();
          } catch {
            return Response.json(
              {
                ok: false,
                code: "invalid_input",
                message: "Enter a message to analyze.",
                detail: "Request body must be JSON.",
              },
              { status: 400 },
            );
          }

          const userMessage =
            body && typeof body === "object" && "user_message" in body
              ? (body as { user_message: unknown }).user_message
              : undefined;

          const result = await evaluateMessage(userMessage);
          const status = result.ok
            ? 200
            : result.code === "invalid_input"
              ? 400
              : result.code === "missing_api_key"
                ? 503
                : result.code === "timeout" || result.code === "network"
                  ? 504
                  : 502;
          return Response.json(result, { status });
        } catch {
          return Response.json(
            {
              ok: false,
              code: "typesafe_error",
              message: JEV_UNAVAILABLE,
              detail: "The analysis endpoint failed unexpectedly.",
            },
            { status: 500 },
          );
        }
      },
    },
  },
});
