import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/listes/$listId")({
  component: ListPlaceholder,
});

function ListPlaceholder() {
  const { listId } = Route.useParams();
  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <h1 className="text-xl font-semibold">Liste {listId}</h1>
    </main>
  );
}
