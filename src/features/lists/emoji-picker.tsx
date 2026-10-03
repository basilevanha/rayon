import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { LIST_EMOJIS } from "@/features/lists/schemas";

// LST-01 : grille fixe d'emojis, champ « emoji » d'un formulaire.
export function EmojiPicker({ defaultValue }: { defaultValue: string }) {
  const { t } = useTranslation("lists");
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 text-sm font-medium">{t("create.emojiLabel")}</legend>
      <div className="grid grid-cols-6 gap-1 sm:grid-cols-8">
        {LIST_EMOJIS.map((emoji) => (
          <label
            key={emoji}
            className={cn(
              "flex size-11 cursor-pointer items-center justify-center rounded-lg text-2xl",
              "has-checked:bg-accent has-checked:ring-2 has-checked:ring-primary",
              "has-focus-visible:ring-2 has-focus-visible:ring-ring",
            )}
          >
            <input
              type="radio"
              name="emoji"
              value={emoji}
              defaultChecked={emoji === defaultValue}
              className="sr-only"
              aria-label={t("defaultEmoji", { emoji })}
            />
            <span aria-hidden>{emoji}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
