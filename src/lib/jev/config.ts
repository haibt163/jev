import { createServerFn } from "@tanstack/react-start";

export const getTypesafeConfig = createServerFn({ method: "POST" }).handler(
  async (): Promise<{
    configured: boolean;
    status: "connected" | "missing_key";
  }> => {
    const { getJevConnection } = await import("./typesafe.server.ts");
    return getJevConnection();
  },
);
