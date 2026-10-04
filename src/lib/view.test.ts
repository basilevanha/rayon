import { describe, expect, it } from "vitest";
import { addRecentStore, RECENT_STORES_COUNT, resolveView, type ListView } from "@/lib/view";

const view = (listId: string, storeId: string | null, updatedAt: string): ListView => ({
  listId,
  storeId,
  updatedAt,
});

describe("resolveView (PRE-11)", () => {
  it("uses the view chosen for the list", () => {
    const views = [view("maison", "colruyt", "2026-10-01"), view("apro", "delhaize", "2026-10-03")];
    expect(resolveView("maison", views)).toBe("colruyt");
  });

  it("keeps « Défaut » when it was chosen for the list", () => {
    const views = [view("maison", null, "2026-10-01"), view("apro", "delhaize", "2026-10-03")];
    expect(resolveView("maison", views)).toBeNull();
  });

  it("falls back on the last view chosen by the account, in any list", () => {
    const views = [
      view("maison", "colruyt", "2026-10-01"),
      view("apro", "delhaize", "2026-10-03"),
      view("vacances", null, "2026-10-02"),
    ];
    expect(resolveView("nouvelle", views)).toBe("delhaize");
  });

  it("falls back on « Défaut » without any view", () => {
    expect(resolveView("nouvelle", [])).toBeNull();
  });
});

describe("addRecentStore (OFF-06, COU-01)", () => {
  it("puts the store first", () => {
    expect(addRecentStore(["a", "b"], "c")).toEqual(["c", "a", "b"]);
  });

  it("moves a known store first, without duplicate", () => {
    expect(addRecentStore(["a", "b", "c"], "b")).toEqual(["b", "a", "c"]);
  });

  it(`keeps the ${RECENT_STORES_COUNT} most recent stores`, () => {
    expect(addRecentStore(["a", "b", "c", "d", "e"], "f")).toEqual(["f", "a", "b", "c", "d"]);
  });

  it("keeps the same array when the store is already first", () => {
    const recents = ["a", "b"];
    expect(addRecentStore(recents, "a")).toBe(recents);
  });
});
