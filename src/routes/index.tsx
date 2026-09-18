import { createFileRoute } from "@tanstack/react-router";
import { LiveRouter } from "@/components/live-router";
import { getTypesafeConfig } from "@/lib/jev/config";

export const Route = createFileRoute("/")({
  loader: () => getTypesafeConfig(),
  component: Home,
});

function Home() {
  const config = Route.useLoaderData();
  return (
    <LiveRouter configured={config.configured} status={config.status} />
  );
}
