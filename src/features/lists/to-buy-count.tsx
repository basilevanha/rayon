import { useTranslation } from "react-i18next";

// LST-02 : nombre d'articles à acheter d'une liste, lu en entier par les lecteurs d'écran.
export function ToBuyCount({ count }: { count: number }) {
  const { t } = useTranslation("lists");
  return (
    <span className="shrink-0 text-sm text-muted-foreground tabular-nums">
      <span aria-hidden>{count}</span>
      <span className="sr-only">{t("toBuy", { count })}</span>
    </span>
  );
}
