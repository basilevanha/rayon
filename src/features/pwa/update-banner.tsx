import { useRegisterSW } from "virtual:pwa-register/react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";

// PWA-02 : jamais de mise à jour silencieuse.
export function UpdateBanner() {
  const { t } = useTranslation(["pwa", "common"]);
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  if (!needRefresh) return null;

  return (
    <output className="fixed inset-x-0 bottom-0 z-50 mx-auto flex max-w-[1000px] items-center justify-between gap-3 border-t bg-card p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <span className="text-sm">{t("updateAvailable")}</span>
      <Button className="min-h-11" onClick={() => updateServiceWorker(true)}>
        {t("common:actions.update")}
      </Button>
    </output>
  );
}
