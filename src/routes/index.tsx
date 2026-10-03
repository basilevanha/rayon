import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: () => (
    <main className="flex flex-1 items-center justify-center p-6">
      <h1 className="text-2xl font-semibold">Rayon</h1>
    </main>
  ),
});
