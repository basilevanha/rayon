export type SortRayon = {
  id: string;
  name: string;
  referenceOrder: number;
};

export type SortArticle = {
  id: string;
  name: string;
  rayonId: string;
};

export type SortInput<A extends SortArticle> = {
  articles: readonly A[];
  rayons: readonly SortRayon[];
  /** Rayon order of the selected store (DIS-01). Absent: « Défaut » view. */
  storeOrder?: readonly string[] | null;
  /** Rayon of each article in the selected store, when it differs (RNG-01). Ignored without a store. */
  placements?: ReadonlyMap<string, string> | null;
};

export type SortedSection<A extends SortArticle> = {
  rayonId: string;
  articles: A[];
};

const collator = new Intl.Collator("fr", { sensitivity: "base", numeric: true });

const byId = (a: { id: string }, b: { id: string }) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

const byName = (a: SortArticle, b: SortArticle) => collator.compare(a.name, b.name) || byId(a, b);

/**
 * Store order, or reference order. A rayon missing from the store order (added since,
 * ADM-03) goes right after its nearest reference predecessor (TEC-02).
 */
export function orderRayons(
  rayons: readonly SortRayon[],
  storeOrder: readonly string[] | null | undefined,
): string[] {
  const reference = rayons
    .toSorted((a, b) => a.referenceOrder - b.referenceOrder || byId(a, b))
    .map((r) => r.id);
  if (!storeOrder) return reference;

  const known = new Set(reference);
  const order = [...new Set(storeOrder)].filter((id) => known.has(id));
  const placed = new Set(order);
  reference.forEach((id, index) => {
    if (placed.has(id)) return;
    const predecessor = reference.slice(0, index).findLast((p) => placed.has(p));
    order.splice(predecessor === undefined ? 0 : order.indexOf(predecessor) + 1, 0, id);
    placed.add(id);
  });
  return order;
}

/** Groups a list's articles by rayon, for a store or the « Défaut » view (TEC-02, RNG-01). */
export function sortByRayon<A extends SortArticle>(input: SortInput<A>): SortedSection<A>[] {
  const { articles, rayons, storeOrder, placements } = input;
  const known = new Set(rayons.map((r) => r.id));

  const groups = new Map<string, A[]>();
  for (const a of articles) {
    // ART-07 : the « Défaut » view shows the article's own rayon.
    const rayonId = (storeOrder && placements?.get(a.id)) || a.rayonId;
    const group = groups.get(rayonId);
    if (group) group.push(a);
    else groups.set(rayonId, [a]);
  }

  // Known rayons in order. A rayon not loaded yet (article or placement) gets a section at the end.
  const order = orderRayons(rayons, storeOrder);
  const unknown = [...groups.keys()].filter((id) => !known.has(id)).toSorted();
  return [...order, ...unknown].flatMap((rayonId) => {
    const group = groups.get(rayonId);
    return group ? [{ rayonId, articles: group.toSorted(byName) }] : [];
  });
}

/** Flat « A → Z » display (PRE-10). */
export function sortAlphabetically<A extends SortArticle>(articles: readonly A[]): A[] {
  return articles.toSorted(byName);
}
