/** PRE-11 : view chosen by the account for a list. No store: « Défaut ». */
export type ListView = {
  listId: string;
  storeId: string | null;
  updatedAt: string;
};

/**
 * PRE-11 : the view of the list; without one, the last view chosen by the account, in any
 * list; otherwise « Défaut » (null).
 */
export function resolveView(listId: string, views: readonly ListView[]): string | null {
  const own = views.find((v) => v.listId === listId);
  if (own) return own.storeId;
  const latest = views.reduce<ListView | undefined>(
    (best, v) => (!best || v.updatedAt > best.updatedAt ? v : best),
    undefined,
  );
  return latest?.storeId ?? null;
}

export const RECENT_STORES_COUNT = 5;

/** OFF-06, COU-01 : the 5 last stores used, most recent first. */
export function addRecentStore(recents: readonly string[], storeId: string): readonly string[] {
  if (recents[0] === storeId) return recents;
  return [storeId, ...recents.filter((id) => id !== storeId)].slice(0, RECENT_STORES_COUNT);
}
