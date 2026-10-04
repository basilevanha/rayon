import type { ArticleStatus } from "@/lib/article-status";

export type ArticleState = {
  id: string;
  status: ArticleStatus;
  quantity: number | null;
  deletedAt: string | null;
  /** Author of the last status change (COL-04). null: account deleted since. */
  statusBy: string | null;
  updatedBy: string;
  /** Server timestamp (COL-02). */
  updatedAt: string;
};

export type RemoteAlert = {
  kind: "added" | "removed" | "put_back" | "quantity_changed";
  articleId: string;
  by: string;
};

type Stamped = Pick<ArticleState, "updatedAt" | "updatedBy">;

/** Last write wins; equal timestamps are settled by author id (COL-02). */
export function resolveConcurrent<T extends Stamped>(a: T, b: T): T {
  const diff = Date.parse(a.updatedAt) - Date.parse(b.updatedAt);
  if (diff !== 0) return diff > 0 ? a : b;
  return b.updatedBy > a.updatedBy ? b : a;
}

function isWanted(article: ArticleState | null): boolean {
  return article !== null && article.deletedAt === null && article.status !== "catalogue";
}

/**
 * Alert shown during a shopping session for another member's change (COL-03).
 * The caller handles a session ended by another member (COL-06) without this.
 */
export function remoteChangeAlert(
  prev: ArticleState | null,
  next: ArticleState,
  context: { me: string; inSession: boolean },
): RemoteAlert | null {
  if (!context.inSession || next.updatedBy === context.me) return null;
  const alert = (kind: RemoteAlert["kind"]): RemoteAlert => ({
    kind,
    articleId: next.id,
    by: next.updatedBy,
  });

  const wasWanted = isWanted(prev);
  const isNowWanted = isWanted(next);
  if (!wasWanted && isNowWanted) return next.status === "a_acheter" ? alert("added") : null;
  if (wasWanted && !isNowWanted) return alert(prev?.status === "caddie" ? "put_back" : "removed");
  if (wasWanted && isNowWanted && prev?.quantity !== next.quantity) {
    return alert("quantity_changed");
  }
  return null;
}

/**
 * Removing an article another member put in the cart needs confirmation (COL-04).
 * statusBy, unlike updatedBy, survives a later quantity change.
 */
export function needsRemovalConfirmation(
  article: Pick<ArticleState, "status" | "statusBy">,
  me: string,
): boolean {
  return article.status === "caddie" && article.statusBy !== me;
}

/**
 * Merges an article created offline into the existing one with the same
 * normalized name (OFF-05, ART-04). The incoming article's placements are dropped.
 */
export function mergeDuplicate<T extends Pick<ArticleState, "status" | "quantity">>(
  existing: T,
  incoming: Pick<ArticleState, "quantity">,
): T {
  return {
    ...existing,
    status: existing.status === "catalogue" ? "a_acheter" : existing.status,
    quantity: incoming.quantity ?? existing.quantity,
  };
}

/**
 * Applies an article received in real time to the cached ones (COL-01). The newer
 * version wins (COL-02); a deleted article leaves the cache (ART-08). Returns the same
 * array when nothing changes.
 */
export function mergeRemoteArticle<T extends Stamped & { id: string }>(
  local: readonly T[],
  remote: T & { deletedAt: string | null },
): readonly T[] {
  const index = local.findIndex((a) => a.id === remote.id);
  if (remote.deletedAt !== null) {
    return index === -1 ? local : local.filter((a) => a.id !== remote.id);
  }
  if (index === -1) return [...local, remote];
  const current = local[index];
  if (resolveConcurrent(current, remote) === current) return local;
  return local.map((a, i) => (i === index ? remote : a));
}
