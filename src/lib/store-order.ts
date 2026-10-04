/**
 * DIS-02 : moves a rayon in a store's full order (as given by `orderRayons`), and returns
 * the whole new order, sent at once to `ordonner_rayons`. Unchanged order: same array.
 */
export function moveRayon(
  order: readonly string[],
  rayonId: string,
  toIndex: number,
): readonly string[] {
  const from = order.indexOf(rayonId);
  const to = Math.min(Math.max(toIndex, 0), order.length - 1);
  if (from === -1 || from === to) return order;
  const next = order.toSpliced(from, 1);
  next.splice(to, 0, rayonId);
  return next;
}
