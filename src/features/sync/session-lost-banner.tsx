import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

// OFF-08 : la session a été refusée en ligne. Les données de l'appareil et la file
// d'attente restent ; la reconnexion les rejoue.
export function SessionLostBanner() {
  const { t } = useTranslation("sync");
  return (
    <div className="flex min-h-11 items-center justify-between gap-3 bg-foreground px-4 text-sm text-background">
      <span>{t("sessionLost")}</span>
      <Link
        to="/connexion"
        className="inline-flex min-h-11 items-center font-medium underline underline-offset-4 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        {t("reconnect")}
      </Link>
    </div>
  );
}
