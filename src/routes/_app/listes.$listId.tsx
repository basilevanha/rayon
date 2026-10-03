import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/_app/listes/$listId")({
  component: ListPlaceholder,
});

function ListPlaceholder() {
  const { listId } = Route.useParams();
  const { t } = useTranslation("lists");
  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <h1 className="text-xl font-semibold">{t("placeholderTitle", { id: listId })}</h1>
    </main>
  );
}
