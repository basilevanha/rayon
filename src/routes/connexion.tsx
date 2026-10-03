import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/connexion")({
  component: () => (
    <main className="flex flex-1 items-center justify-center p-6">
      <h1 className="text-xl font-semibold">Connexion</h1>
    </main>
  ),
});
