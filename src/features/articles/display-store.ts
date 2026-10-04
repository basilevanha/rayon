import { z } from "zod";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type ArticleDisplay = "rayon" | "alpha";

const persistedSchema = z.object({ display: z.enum(["rayon", "alpha"]) });

type DisplayState = {
  display: ArticleDisplay;
  setDisplay: (display: ArticleDisplay) => void;
};

// PRE-12 : « Par rayon » ou « A → Z », mémorisé sur l'appareil pour toutes les listes.
export const useDisplayStore = create<DisplayState>()(
  persist(
    (set) => ({
      display: "rayon",
      setDisplay: (display) => set({ display }),
    }),
    {
      name: "rayon-display",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ display: state.display }),
      merge: (persisted, current) => {
        const parsed = persistedSchema.safeParse(persisted);
        return parsed.success ? { ...current, ...parsed.data } : current;
      },
    },
  ),
);
