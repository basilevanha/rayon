import { beforeEach, describe, expect, it, vi } from "vitest";

const STORAGE_KEY = "rayon-last-list";
const LIST_ID = "6f1c2b8e-3d4a-4f5b-9c6d-7e8f9a0b1c2d";

async function loadStore() {
  vi.resetModules();
  const { useLastListStore } = await import("@/features/lists/last-list-store");
  return useLastListStore;
}

describe("useLastListStore (LST-03)", () => {
  beforeEach(() => localStorage.clear());

  it("remembers the last opened list across reloads", async () => {
    const store = await loadStore();
    store.getState().setLastListId(LIST_ID);
    const reloaded = await loadStore();
    expect(reloaded.getState().lastListId).toBe(LIST_ID);
  });

  it("ignores a corrupted stored value", async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ state: { lastListId: 42 }, version: 0 }));
    const store = await loadStore();
    expect(store.getState().lastListId).toBeNull();
  });

  it("forgets a list only if it is the remembered one", async () => {
    const store = await loadStore();
    store.getState().setLastListId(LIST_ID);
    store.getState().forgetList("0b9f8e7d-6c5b-4a39-8281-7f6e5d4c3b2a");
    expect(store.getState().lastListId).toBe(LIST_ID);
    store.getState().forgetList(LIST_ID);
    expect(store.getState().lastListId).toBeNull();
  });
});
