import { z } from "zod";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

const persistedSchema = z.object({ lastListId: z.uuid().nullable() });

type LastListState = {
  lastListId: string | null;
  setLastListId: (listId: string) => void;
  // Liste quittée, supprimée ou devenue inaccessible.
  forgetList: (listId: string) => void;
};

// LST-03 : la dernière liste ouverte est mémorisée sur l'appareil.
export const useLastListStore = create<LastListState>()(
  persist(
    (set) => ({
      lastListId: null,
      setLastListId: (listId) => set({ lastListId: listId }),
      forgetList: (listId) =>
        set((state) => (state.lastListId === listId ? { lastListId: null } : state)),
    }),
    {
      name: "rayon-last-list",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ lastListId: state.lastListId }),
      merge: (persisted, current) => {
        const parsed = persistedSchema.safeParse(persisted);
        return parsed.success ? { ...current, ...parsed.data } : current;
      },
    },
  ),
);
