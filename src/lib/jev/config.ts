import { createServerFn } from "@tanstack/react-start";
import { getJevConnection } from "@/lib/jev/core/typesafe.server";
import { listUseCases } from "@/lib/jev/usecases/registry";

/**
 * Server loader data for the playground: connection status plus the
 * use-case registry summary the client renders selectors from.
 */
export const getTypesafeConfig = createServerFn({ method: "POST" }).handler(
  async () => {
    return {
      connection: getJevConnection(),
      useCases: listUseCases(),
    };
  },
);
