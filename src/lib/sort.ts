export type SortRayon = {
  id: string;
  name: string;
  referenceOrder: number;
  /** Set for a list subrayon (RAY-02). */
  parentId?: string | null;
};

export type SortArticle = {
  id: string;
  name: string;
  startRayonId: string | null;
};

export type Placement = {
  rayonId: string;
  position: number | null;
};

export type SortInput<A extends SortArticle> = {
  articles: readonly A[];
  rayons: readonly SortRayon[];
  /** Rayons present in the store, in order (DIS-01). Absent: no store selected. */
  layout?: readonly string[] | null;
  /** Account route in this store (PAR-01). Only orders the layout rayons. */
  route?: readonly string[] | null;
  /** List placements in this store, by article id (RNG-02). */
  placements?: ReadonlyMap<string, Placement> | null;
};

export type SortedSection<A extends SortArticle> = {
  /** null: « Sans rayon ». */
  rayonId: string | null;
  articles: A[];
};

const collator = new Intl.Collator("fr", { sensitivity: "base" });

const byId = (a: { id: string }, b: { id: string }) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

/** Common rayon order: route, then layout, then reference order (TEC-02). */
function orderTopRayons(
  rayons: readonly SortRayon[],
  layout: readonly string[] | null | undefined,
  route: readonly string[] | null | undefined,
): string[] {
  if (!layout) {
    return rayons
      .filter((r) => !r.parentId)
      .toSorted((a, b) => a.referenceOrder - b.referenceOrder || byId(a, b))
      .map((r) => r.id);
  }
  const present = new Set(layout);
  const order = [...new Set(route ?? [])].filter((id) => present.has(id));
  const placed = new Set(order);
  // A layout rayon missing from the route goes right after its layout predecessor.
  layout.forEach((id, index) => {
    if (placed.has(id)) return;
    const predecessor = index > 0 ? layout[index - 1] : undefined;
    const at = predecessor === undefined ? -1 : order.indexOf(predecessor);
    order.splice(at + 1, 0, id);
    placed.add(id);
  });
  return order;
}

function compareArticles<A extends SortArticle>(
  placements: ReadonlyMap<string, Placement> | null | undefined,
  rayonId: string | null,
): (a: A, b: A) => number {
  // A position only orders articles within the rayon it was set in.
  const positionOf = (article: A) => {
    const placement = placements?.get(article.id);
    return placement && placement.rayonId === rayonId ? placement.position : null;
  };
  return (a, b) => {
    const pa = positionOf(a);
    const pb = positionOf(b);
    if (pa !== null && pb !== null && pa !== pb) return pa - pb;
    if (pa !== null && pb === null) return -1;
    if (pa === null && pb !== null) return 1;
    return collator.compare(a.name, b.name) || byId(a, b);
  };
}

/** Groups and orders a list's articles for a store (TEC-02, RNG-01 to RNG-04, PRE-04). */
export function sortList<A extends SortArticle>(input: SortInput<A>): SortedSection<A>[] {
  const { articles, rayons, layout, route, placements } = input;
  const known = new Set(rayons.map((r) => r.id));
  const topLevel = new Set(rayons.filter((r) => !r.parentId).map((r) => r.id));

  // Section order: each common rayon, then its subrayons alphabetically.
  const sectionOrder: string[] = [];
  for (const topId of orderTopRayons(rayons, layout, route)) {
    if (!topLevel.has(topId) || sectionOrder.includes(topId)) continue;
    sectionOrder.push(topId);
    rayons
      .filter((r) => r.parentId === topId)
      .toSorted((a, b) => collator.compare(a.name, b.name) || byId(a, b))
      .forEach((r) => sectionOrder.push(r.id));
  }
  const visible = new Set(sectionOrder);

  const groups = new Map<string | null, A[]>();
  for (const a of articles) {
    const rayonId = placements?.get(a.id)?.rayonId ?? a.startRayonId;
    const key = rayonId !== null && known.has(rayonId) && visible.has(rayonId) ? rayonId : null;
    const group = groups.get(key);
    if (group) group.push(a);
    else groups.set(key, [a]);
  }

  return [null, ...sectionOrder].flatMap((rayonId) => {
    const group = groups.get(rayonId);
    return group
      ? [{ rayonId, articles: group.toSorted(compareArticles<A>(placements, rayonId)) }]
      : [];
  });
}
