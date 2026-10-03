import { describe, expect, it } from "vitest";
import { sortLists } from "@/features/lists/queries";

const list = (name: string, index: number) => ({
  id: `00000000-0000-4000-8000-00000000000${index}`,
  name,
  emoji: "🛒",
});

describe("sortLists (NAV-06)", () => {
  it("sorts by name, ignoring case and accents, numbers in natural order", () => {
    const names = ["Liste 10", "école", "Liste 2", "Apéro", "bureau"].map(list);
    expect(sortLists(names).map((l) => l.name)).toEqual([
      "Apéro",
      "bureau",
      "école",
      "Liste 2",
      "Liste 10",
    ]);
  });
});
