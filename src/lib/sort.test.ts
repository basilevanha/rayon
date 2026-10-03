import { describe, expect, it } from "vitest";
import { type SortArticle, type SortInput, type SortRayon, sortList } from "@/lib/sort";

const rayons: SortRayon[] = [
  { id: "fruits", name: "Fruits", referenceOrder: 1 },
  { id: "laitiers", name: "Laitiers", referenceOrder: 2 },
  { id: "hygiene", name: "Hygiène", referenceOrder: 3 },
  { id: "boissons", name: "Boissons", referenceOrder: 4 },
  { id: "toilette", name: "Toilette", referenceOrder: 0, parentId: "hygiene" },
  { id: "bebe", name: "Bébé", referenceOrder: 0, parentId: "hygiene" },
];

const article = (id: string, name: string, startRayonId: string | null): SortArticle => ({
  id,
  name,
  startRayonId,
});

const pomme = article("pomme", "Pomme", "fruits");
const lait = article("lait", "Lait", "laitiers");
const savon = article("savon", "Savon", "hygiene");
const eau = article("eau", "Eau", "boissons");

// Returns [rayonId, articleIds][] for readable assertions.
function shape(input: SortInput<SortArticle>) {
  return sortList(input).map((s) => [s.rayonId, s.articles.map((a) => a.id)]);
}

describe("sortList (TEC-02)", () => {
  it("follows the reference order without a store", () => {
    expect(shape({ articles: [eau, savon, lait, pomme], rayons })).toEqual([
      ["fruits", ["pomme"]],
      ["laitiers", ["lait"]],
      ["hygiene", ["savon"]],
      ["boissons", ["eau"]],
    ]);
  });

  it("follows the store layout", () => {
    expect(
      shape({
        articles: [eau, lait, pomme],
        rayons,
        layout: ["boissons", "laitiers", "fruits"],
      }),
    ).toEqual([
      ["boissons", ["eau"]],
      ["laitiers", ["lait"]],
      ["fruits", ["pomme"]],
    ]);
  });

  it("prefers the account route over the layout", () => {
    expect(
      shape({
        articles: [eau, lait, pomme],
        rayons,
        layout: ["boissons", "laitiers", "fruits"],
        route: ["fruits", "laitiers", "boissons"],
      }),
    ).toEqual([
      ["fruits", ["pomme"]],
      ["laitiers", ["lait"]],
      ["boissons", ["eau"]],
    ]);
  });

  it("keeps a layout rayon missing from the route at its relative place", () => {
    expect(
      shape({
        articles: [eau, lait, pomme, savon],
        rayons,
        layout: ["fruits", "hygiene", "laitiers", "boissons"],
        route: ["boissons", "fruits", "laitiers"],
      }),
    ).toEqual([
      ["boissons", ["eau"]],
      ["fruits", ["pomme"]],
      ["hygiene", ["savon"]],
      ["laitiers", ["lait"]],
    ]);
  });

  it("puts a layout rayon missing from the route first when it has no predecessor", () => {
    expect(
      shape({
        articles: [eau, pomme],
        rayons,
        layout: ["fruits", "boissons"],
        route: ["boissons"],
      }),
    ).toEqual([
      ["fruits", ["pomme"]],
      ["boissons", ["eau"]],
    ]);
  });

  it("sends a route rayon removed from the layout to « Sans rayon » (RNG-03)", () => {
    expect(
      shape({
        articles: [eau, lait],
        rayons,
        layout: ["laitiers"],
        route: ["boissons", "laitiers"],
      }),
    ).toEqual([
      [null, ["eau"]],
      ["laitiers", ["lait"]],
    ]);
  });

  it("sends a rayon absent from the layout to « Sans rayon » (RNG-03)", () => {
    expect(shape({ articles: [savon, lait], rayons, layout: ["laitiers"] })).toEqual([
      [null, ["savon"]],
      ["laitiers", ["lait"]],
    ]);
  });

  it("puts articles without a rayon first (PRE-04)", () => {
    const sel = article("sel", "Sel", null);
    expect(shape({ articles: [lait, sel], rayons })).toEqual([
      [null, ["sel"]],
      ["laitiers", ["lait"]],
    ]);
  });

  it("treats an unknown rayon as « Sans rayon »", () => {
    const x = article("x", "Mystère", "inconnu");
    expect(shape({ articles: [x], rayons })).toEqual([[null, ["x"]]]);
  });

  it("prefers the list placement over the start rayon (RNG-01)", () => {
    expect(
      shape({
        articles: [lait, pomme],
        rayons,
        placements: new Map([["lait", { rayonId: "fruits", position: null }]]),
      }),
    ).toEqual([["fruits", ["lait", "pomme"]]]);
  });

  it("sorts subrayons after their parent, alphabetically (RAY-02)", () => {
    const couches = article("couches", "Couches", "bebe");
    const brosse = article("brosse", "Brosse à dents", "toilette");
    expect(
      shape({
        articles: [brosse, eau, couches, savon],
        rayons,
        layout: ["hygiene", "boissons"],
      }),
    ).toEqual([
      ["hygiene", ["savon"]],
      ["bebe", ["couches"]],
      ["toilette", ["brosse"]],
      ["boissons", ["eau"]],
    ]);
  });

  it("drops subrayons whose parent is absent from the layout (RNG-03)", () => {
    const couches = article("couches", "Couches", "bebe");
    expect(shape({ articles: [couches], rayons, layout: ["boissons"] })).toEqual([
      [null, ["couches"]],
    ]);
  });

  it("puts positioned articles first, then alphabetical order with accents (RNG-04)", () => {
    const items = [
      article("farine", "Farine", "fruits"),
      article("eclair", "Éclair", "fruits"),
      article("eau2", "eau", "fruits"),
      article("kiwi", "Kiwi", "fruits"),
      article("abricot", "Abricot", "fruits"),
    ];
    expect(
      shape({
        articles: items,
        rayons,
        placements: new Map([
          ["kiwi", { rayonId: "fruits", position: 1 }],
          ["farine", { rayonId: "fruits", position: 2 }],
        ]),
      }),
    ).toEqual([["fruits", ["kiwi", "farine", "abricot", "eau2", "eclair"]]]);
  });

  it("orders positions only within their own rayon", () => {
    const sel = article("sel", "Sel", null);
    const yaourt = article("yaourt", "Yaourt", "laitiers");
    expect(
      shape({
        articles: [sel, yaourt],
        rayons,
        layout: ["fruits"],
        placements: new Map([["yaourt", { rayonId: "laitiers", position: 1 }]]),
      }),
    ).toEqual([[null, ["sel", "yaourt"]]]);
  });

  it("ignores duplicated or subrayon ids in the route and layout", () => {
    expect(
      shape({
        articles: [eau, lait],
        rayons,
        layout: ["laitiers", "bebe", "boissons"],
        route: ["boissons", "boissons", "laitiers"],
      }),
    ).toEqual([
      ["boissons", ["eau"]],
      ["laitiers", ["lait"]],
    ]);
  });

  it("breaks reference order and subrayon name ties by id", () => {
    const tied: SortRayon[] = [
      { id: "b", name: "B", referenceOrder: 1 },
      { id: "a", name: "A", referenceOrder: 1 },
      { id: "s2", name: "Même", referenceOrder: 0, parentId: "a" },
      { id: "s1", name: "Même", referenceOrder: 0, parentId: "a" },
    ];
    const items = ["b", "a", "s2", "s1"].map((id) => article(`x-${id}`, "X", id));
    expect(shape({ articles: items, rayons: tied }).map(([id]) => id)).toEqual([
      "a",
      "s1",
      "s2",
      "b",
    ]);
  });

  it("omits empty rayons and returns nothing for an empty list", () => {
    expect(shape({ articles: [], rayons, layout: ["fruits"] })).toEqual([]);
  });

  it("is stable regardless of the input order", () => {
    const a = article("a", "Pomme", "fruits");
    const b = article("b", "pomme", "fruits");
    const forward = shape({ articles: [a, b, lait], rayons });
    const backward = shape({ articles: [lait, b, a], rayons });
    expect(forward).toEqual(backward);
    expect(forward[0]).toEqual(["fruits", ["a", "b"]]);
  });

  it("keeps the caller's article objects", () => {
    const rich = { ...pomme, status: "a_acheter" as const };
    const [section] = sortList({ articles: [rich], rayons });
    expect(section?.articles[0]).toBe(rich);
  });
});
