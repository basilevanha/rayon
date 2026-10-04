/** RNG-01 : rayon of an article in a store, when it differs from the article's rayon. */
export type Placement = {
  articleId: string;
  storeId: string;
  listId: string;
  rayonId: string;
};

/** COL-01 : a placement received from another member. No rayon: the placement was removed. */
export type RemotePlacement = Omit<Placement, "rayonId"> & { rayonId: string | null };

export type PlacementChange = {
  article: { id: string; listId: string; rayonId: string };
  /** Selected store; null for the « Défaut » view. */
  storeId: string | null;
  rayonId: string;
  /** ART-07 : « Dans tous les magasins ». */
  everywhere?: boolean;
};

const sameKey = (p: { articleId: string; storeId: string }, articleId: string, storeId: string) =>
  p.articleId === articleId && p.storeId === storeId;

/**
 * ART-07, RNG-02 : same rules as `ranger_article`, for the optimistic cache. Returns the new
 * placements and the article's rayon. Unchanged placements: same array.
 */
export function applyPlacement(
  placements: readonly Placement[],
  { article, storeId, rayonId, everywhere = false }: PlacementChange,
): { placements: readonly Placement[]; rayonId: string } {
  if (everywhere || storeId === null) {
    const others = placements.filter((p) => p.articleId !== article.id);
    return {
      placements: others.length === placements.length ? placements : others,
      rayonId: everywhere ? rayonId : article.rayonId,
    };
  }
  const current = placements.find((p) => sameKey(p, article.id, storeId));
  const wanted = rayonId === article.rayonId ? undefined : rayonId;
  if (current?.rayonId === wanted) return { placements, rayonId: article.rayonId };
  const others = placements.filter((p) => !sameKey(p, article.id, storeId));
  return {
    placements: wanted
      ? [...others, { articleId: article.id, storeId, listId: article.listId, rayonId: wanted }]
      : others,
    rayonId: article.rayonId,
  };
}

/** RNG-02 : the article's rayon changed; a placement now equal to it disappears. */
export function dropRedundantPlacements(
  placements: readonly Placement[],
  articleId: string,
  rayonId: string,
): readonly Placement[] {
  const kept = placements.filter((p) => p.articleId !== articleId || p.rayonId !== rayonId);
  return kept.length === placements.length ? placements : kept;
}

/** RNG-01 : rayon of each article in the store, for `sortByRayon`. Empty for « Défaut ». */
export function placementsForStore(
  placements: readonly Placement[],
  storeId: string | null,
): Map<string, string> {
  if (storeId === null) return new Map();
  return new Map(
    placements.filter((p) => p.storeId === storeId).map((p) => [p.articleId, p.rayonId]),
  );
}

/** ART-07 : « Rangé ailleurs dans n magasins ». */
export function countPlacedElsewhere(placements: readonly Placement[], articleId: string): number {
  return placements.filter((p) => p.articleId === articleId).length;
}

/** COL-01 : applies a placement received in real time. Already known: same array. */
export function mergeRemotePlacement(
  placements: readonly Placement[],
  remote: RemotePlacement,
): readonly Placement[] {
  const { articleId, storeId, rayonId } = remote;
  const current = placements.find((p) => sameKey(p, articleId, storeId));
  if ((current?.rayonId ?? null) === rayonId) return placements;
  const others = placements.filter((p) => !sameKey(p, articleId, storeId));
  return rayonId === null ? others : [...others, { ...remote, rayonId }];
}
