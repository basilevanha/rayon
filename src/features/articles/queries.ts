import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";
import { ARTICLE_COLUMNS, articleSchema, rayonSchema } from "@/features/articles/schemas";
import { supabase } from "@/lib/supabase";

export const articleKeys = {
  // Les articles de toutes les listes du compte, en une requête : chaque liste reste
  // utilisable hors ligne (OFF-01) et la suggestion de rayon lit les autres listes (ART-05).
  all: (userId: string) => ["articles", userId] as const,
  rayons: ["rayons"] as const,
};

// RLS : seuls les articles des listes dont le compte est membre (SEC-01).
export const articlesQueryOptions = (userId: string) =>
  queryOptions({
    queryKey: articleKeys.all(userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("articles")
        .select(ARTICLE_COLUMNS)
        .is("deleted_at", null);
      if (error) throw error;
      return z.array(articleSchema).parse(data);
    },
  });

// RAY-01 : référentiel, dans l'ordre de référence. Il ne change qu'en administration.
export const rayonsQueryOptions = () =>
  queryOptions({
    queryKey: articleKeys.rayons,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rayons")
        .select("id, name, reference_order, deletable")
        .order("reference_order");
      if (error) throw error;
      return z.array(rayonSchema).parse(data);
    },
    staleTime: 60 * 60 * 1000,
  });

// LST-02 : nombre d'articles à acheter par liste.
export function countToBuy(articles: readonly { listId: string; status: string }[]) {
  const counts = new Map<string, number>();
  for (const a of articles) {
    if (a.status === "a_acheter") counts.set(a.listId, (counts.get(a.listId) ?? 0) + 1);
  }
  return counts;
}
