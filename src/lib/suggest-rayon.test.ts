import { describe, expect, it } from "vitest";
import { suggestRayon, TOP_RAYONS_COUNT, topRayons } from "@/lib/suggest-rayon";

describe("suggestRayon (ART-05)", () => {
  const known = [
    { normalizedName: "lait", rayonId: "laitiers", updatedAt: "2026-10-01T10:00:00.000Z" },
    { normalizedName: "lait", rayonId: "autre", updatedAt: "2026-10-02T10:00:00.000Z" },
    { normalizedName: "pain", rayonId: "boulangerie", updatedAt: "2026-10-01T10:00:00.000Z" },
  ];

  it("returns the rayon of the same article in another list", () => {
    expect(suggestRayon("pain", known)).toBe("boulangerie");
  });

  it("prefers the most recently updated article when several match", () => {
    expect(suggestRayon("lait", known)).toBe("autre");
  });

  it("returns null when no article has the same normalized name", () => {
    expect(suggestRayon("lai", known)).toBeNull();
    expect(suggestRayon("", known)).toBeNull();
  });
});

describe("topRayons (ART-05)", () => {
  const rayons = [
    { id: "fruits", referenceOrder: 10 },
    { id: "pain", referenceOrder: 20 },
    { id: "lait", referenceOrder: 30 },
    { id: "eau", referenceOrder: 40 },
    { id: "autre", referenceOrder: 50 },
  ];

  it("ranks the rayons by use in the list, then by reference order", () => {
    const articles = [{ rayonId: "eau" }, { rayonId: "eau" }, { rayonId: "lait" }];
    expect(topRayons(articles, rayons, { count: 3, exclude: ["autre"] })).toEqual([
      "eau",
      "lait",
      "fruits",
    ]);
  });

  it("never returns an excluded rayon, however used", () => {
    const articles = [{ rayonId: "autre" }, { rayonId: "autre" }];
    expect(topRayons(articles, rayons, { count: 2, exclude: ["autre"] })).toEqual([
      "fruits",
      "pain",
    ]);
  });

  it("follows the reference order for a list without articles", () => {
    expect(topRayons([], rayons, { count: 5, exclude: ["autre"] })).toEqual([
      "fruits",
      "pain",
      "lait",
      "eau",
    ]);
  });

  it("offers 5 rayons by default", () => {
    const many = Array.from({ length: 8 }, (_, i) => ({ id: `r${i}`, referenceOrder: i }));
    const articles = many.map((r) => ({ rayonId: r.id }));
    expect(TOP_RAYONS_COUNT).toBe(5);
    expect(topRayons(articles, many, { exclude: [] })).toEqual(["r0", "r1", "r2", "r3", "r4"]);
  });
});
