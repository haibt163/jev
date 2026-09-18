import { createFileRoute } from "@tanstack/react-router";
import { Playground } from "@/components/playground";
import { getTypesafeConfig } from "@/lib/jev/config";

export const Route = createFileRoute("/")({
  loader: () => getTypesafeConfig(),
  component: Home,
});

function Home() {
  const config = Route.useLoaderData();
  return <Playground config={config} />;
}
