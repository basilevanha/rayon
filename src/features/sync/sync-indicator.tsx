import { useEffect, useState } from "react";
import { useMutationState } from "@tanstack/react-query";
import { CloudOff, RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useOnline } from "@/hooks/use-online";
import { PENDING_DELAY_MS, syncStatus } from "@/lib/sync-status";

// OFF-03 : « Hors ligne · n modifications en attente », ou en ligne, des modifications
// qui attendent le serveur depuis plus de 3 secondes.
export function SyncIndicator() {
  const { t } = useTranslation("sync");
  const online = useOnline();
  const pendingSince = useMutationState({
    filters: { status: "pending" },
    select: (mutation) => mutation.state.submittedAt,
  });
  const [now, setNow] = useState(() => Date.now());

  // En ligne, l'indicateur apparaît quand la plus ancienne modification dépasse le délai.
  useEffect(() => {
    if (!online || pendingSince.length === 0) return;
    const timer = setInterval(() => setNow(Date.now()), PENDING_DELAY_MS / 3);
    return () => clearInterval(timer);
  }, [online, pendingSince.length]);

  const status = syncStatus({ online, pendingSince, now });
  const label =
    status === null
      ? null
      : status.kind === "offline"
        ? status.pending > 0
          ? t("offlinePending", { count: status.pending })
          : t("offline")
        : t("pending", { count: status.pending });

  return (
    <output
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 top-14 z-30 flex justify-center px-4"
    >
      {label && (
        <span className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-foreground px-3 py-1 text-xs font-medium text-background shadow">
          {status?.kind === "offline" ? (
            <CloudOff aria-hidden className="size-3.5" />
          ) : (
            <RefreshCw aria-hidden className="size-3.5" />
          )}
          {label}
        </span>
      )}
    </output>
  );
}
