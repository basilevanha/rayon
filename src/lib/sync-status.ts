// OFF-03 : en ligne, des modifications qui attendent depuis ce délai sont signalées.
export const PENDING_DELAY_MS = 3000;

export type SyncStatus = { kind: "offline" | "pending"; pending: number };

/**
 * What the sync indicator shows (OFF-03). `pendingSince`: when each change still
 * waiting for the server was made. null: nothing to show.
 */
export function syncStatus(input: {
  online: boolean;
  pendingSince: readonly number[];
  now: number;
}): SyncStatus | null {
  const { online, pendingSince, now } = input;
  const pending = pendingSince.length;
  if (!online) return { kind: "offline", pending };
  const late = pendingSince.some((since) => now - since > PENDING_DELAY_MS);
  return late ? { kind: "pending", pending } : null;
}
