/** Number of rayon chips under « Créer », besides « Autre » (ART-05). */
export const TOP_RAYONS_COUNT = 5;

export type KnownArticle = {
  normalizedName: string;
  rayonId: string;
  updatedAt: string;
};

/**
 * Rayon of the article with the same normalized name in the account's other lists,
 * the most recently updated one first (ART-05). null: the user picks a rayon.
 */
export function suggestRayon(
  normalizedName: string,
  otherListsArticles: readonly KnownArticle[],
): string | null {
  let best: KnownArticle | null = null;
  for (const article of otherListsArticles) {
    if (article.normalizedName !== normalizedName) continue;
    if (!best || Date.parse(article.updatedAt) > Date.parse(best.updatedAt)) best = article;
  }
  return best?.rayonId ?? null;
}

/**
 * Rayons offered as chips under « Créer » : the most used in the list, ties (and unused
 * rayons) in reference order (ART-05). « Autre » is shown apart, hence `exclude`.
 */
export function topRayons(
  listArticles: readonly { rayonId: string }[],
  rayons: readonly { id: string; referenceOrder: number }[],
  options: { count?: number; exclude: readonly string[] },
): string[] {
  const uses = new Map<string, number>();
  for (const { rayonId } of listArticles) uses.set(rayonId, (uses.get(rayonId) ?? 0) + 1);
  return rayons
    .filter((r) => !options.exclude.includes(r.id))
    .toSorted(
      (a, b) =>
        (uses.get(b.id) ?? 0) - (uses.get(a.id) ?? 0) || a.referenceOrder - b.referenceOrder,
    )
    .slice(0, options.count ?? TOP_RAYONS_COUNT)
    .map((r) => r.id);
}
