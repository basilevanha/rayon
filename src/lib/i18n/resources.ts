import { articles } from "@/features/articles/locales/fr";
import { auth } from "@/features/auth/locales/fr";
import { lists } from "@/features/lists/locales/fr";
import { pwa } from "@/features/pwa/locales/fr";
import { search } from "@/features/search/locales/fr";
import { sync } from "@/features/sync/locales/fr";
import { common } from "@/lib/i18n/fr/common";

// Ajouter une langue : une entrée ici, avec les mêmes espaces de noms et les mêmes clés.
export const resources = {
  fr: { common, auth, pwa, lists, articles, search, sync },
} as const;
