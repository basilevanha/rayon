import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/_app/")({
  component: HomePlaceholder,
});

function HomePlaceholder() {
  const { t } = useTranslation();
  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <h1 className="text-2xl font-semibold">{t("app.name")}</h1>
    </main>
  );
}
