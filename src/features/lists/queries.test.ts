import { describe, expect, it } from "vitest";
import { sortLists } from "@/features/lists/queries";

const list = (name: string, activityAt: string, index: number) => ({
  id: `00000000-0000-4000-8000-00000000000${index}`,
  name,
  emoji: "🛒",
  activity_at: activityAt,
});

describe("sortLists (NAV-06)", () => {
  it("puts the most recently active list first", () => {
    const lists = [
      list("Apéro", "2026-10-01T10:00:00+00:00", 1),
      list("Maison", "2026-10-03T10:00:00+00:00", 2),
      list("Bureau", "2026-10-02T10:00:00Z", 3),
    ];
    expect(sortLists(lists).map((l) => l.name)).toEqual(["Maison", "Bureau", "Apéro"]);
  });

  it("orders lists active at the same time by name, numbers in natural order", () => {
    const at = "2026-10-03T10:00:00+00:00";
    const lists = ["Liste 10", "école", "Liste 2", "Apéro"].map((name, i) => list(name, at, i));
    expect(sortLists(lists).map((l) => l.name)).toEqual(["Apéro", "école", "Liste 2", "Liste 10"]);
  });
});
