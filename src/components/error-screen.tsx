import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";

// QUA-05 : écran de secours de l'error boundary.
export function ErrorScreen() {
  const { t } = useTranslation();
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-xl font-semibold">{t("errors.generic")}</h1>
      <Button className="min-h-11" onClick={() => window.location.reload()}>
        {t("actions.reload")}
      </Button>
    </main>
  );
}
