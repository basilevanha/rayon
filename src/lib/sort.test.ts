import { describe, expect, it } from "vitest";
import {
  type SortArticle,
  type SortInput,
  type SortRayon,
  sortAlphabetically,
  sortByRayon,
} from "@/lib/sort";

const rayons: SortRayon[] = [
  { id: "fruits", name: "Fruits et légumes", referenceOrder: 10 },
  { id: "patates", name: "Pommes de terre et oignons", referenceOrder: 20 },
  { id: "laitiers", name: "Produits laitiers", referenceOrder: 30 },
  { id: "boissons", name: "Eaux", referenceOrder: 40 },
  { id: "autre", name: "Autre", referenceOrder: 50 },
];

const article = (id: string, name: string, rayonId: string): SortArticle => ({
  id,
  name,
  rayonId,
});

const pomme = article("pomme", "Pomme", "fruits");
const banane = article("banane", "Bananes", "fruits");
const oignon = article("oignon", "Oignons", "patates");
const lait = article("lait", "Lait", "laitiers");
const eau = article("eau", "Eau", "boissons");
const pile = article("pile", "Piles", "autre");

// Returns [rayonId, articleIds][] for readable assertions.
function shape(input: SortInput<SortArticle>) {
  return sortByRayon(input).map((s) => [s.rayonId, s.articles.map((a) => a.id)]);
}

describe("sortByRayon (TEC-02, PRE-02)", () => {
  it("follows the reference order in the « Défaut » view", () => {
    expect(shape({ articles: [pile, eau, lait, oignon, pomme], rayons })).toEqual([
      ["fruits", ["pomme"]],
      ["patates", ["oignon"]],
      ["laitiers", ["lait"]],
      ["boissons", ["eau"]],
      ["autre", ["pile"]],
    ]);
  });

  it("follows the store order", () => {
    expect(
      shape({
        articles: [eau, lait, pomme, oignon, pile],
        rayons,
        storeOrder: ["boissons", "autre", "laitiers", "patates", "fruits"],
      }),
    ).toEqual([
      ["boissons", ["eau"]],
      ["autre", ["pile"]],
      ["laitiers", ["lait"]],
      ["patates", ["oignon"]],
      ["fruits", ["pomme"]],
    ]);
  });

  it("places a rayon missing from the store order after its reference predecessor", () => {
    // « patates » (added since, ADM-03) follows « fruits », wherever the store put it.
    expect(
      shape({
        articles: [eau, lait, pomme, oignon],
        rayons,
        storeOrder: ["laitiers", "fruits", "boissons", "autre"],
      }),
    ).toEqual([
      ["laitiers", ["lait"]],
      ["fruits", ["pomme"]],
      ["patates", ["oignon"]],
      ["boissons", ["eau"]],
    ]);
  });

  it("puts a missing rayon first when none of its predecessors is in the store order", () => {
    expect(
      shape({ articles: [pomme, lait], rayons, storeOrder: ["laitiers", "boissons"] }),
    ).toEqual([
      ["fruits", ["pomme"]],
      ["laitiers", ["lait"]],
    ]);
  });

  it("ignores unknown and duplicate ids in the store order", () => {
    expect(
      shape({
        articles: [lait, pomme],
        rayons,
        storeOrder: ["ghost", "laitiers", "laitiers", "fruits", "patates", "boissons", "autre"],
      }),
    ).toEqual([
      ["laitiers", ["lait"]],
      ["fruits", ["pomme"]],
    ]);
  });

  it("uses the article placement in the store over its rayon (RNG-01)", () => {
    expect(
      shape({
        articles: [banane, pomme, oignon],
        rayons,
        storeOrder: ["fruits", "patates", "laitiers", "boissons", "autre"],
        placements: new Map([["banane", "patates"]]),
      }),
    ).toEqual([
      ["fruits", ["pomme"]],
      ["patates", ["banane", "oignon"]],
    ]);
  });

  it("ignores placements in the « Défaut » view (ART-07)", () => {
    expect(
      shape({ articles: [banane], rayons, placements: new Map([["banane", "patates"]]) }),
    ).toEqual([["fruits", ["banane"]]]);
  });

  it("keeps a placement to a rayon not loaded yet, in a trailing section", () => {
    expect(
      shape({
        articles: [banane, pomme],
        rayons,
        storeOrder: ["fruits"],
        placements: new Map([["banane", "ghost"]]),
      }),
    ).toEqual([
      ["fruits", ["pomme"]],
      ["ghost", ["banane"]],
    ]);
  });

  it("hides empty rayons (PRE-03)", () => {
    expect(shape({ articles: [eau], rayons })).toEqual([["boissons", ["eau"]]]);
  });

  it("sorts articles alphabetically within a rayon, French collation and natural numbers", () => {
    const articles = [
      article("o12", "Œufs ×12", "fruits"),
      article("oignon", "oignon rouge", "fruits"),
      article("echalote", "Échalote", "fruits"),
      article("o6", "Œufs ×6", "fruits"),
      article("ail", "Ail", "fruits"),
    ];
    expect(shape({ articles, rayons })).toEqual([
      ["fruits", ["ail", "echalote", "o6", "o12", "oignon"]],
    ]);
  });

  it("keeps an article whose rayon is unknown, in a trailing section", () => {
    const lost = article("lost", "Perdu", "ghost");
    expect(shape({ articles: [lost, lait], rayons })).toEqual([
      ["laitiers", ["lait"]],
      ["ghost", ["lost"]],
    ]);
  });

  it("returns no section for an empty list", () => {
    expect(sortByRayon({ articles: [], rayons })).toEqual([]);
  });
});

describe("sortAlphabetically (PRE-10)", () => {
  it("returns a flat list, French collation, ties broken by id", () => {
    const twinA = article("a", "Lait", "laitiers");
    const twinB = article("b", "lait", "autre");
    expect(sortAlphabetically([pomme, twinB, eau, twinA]).map((a) => a.id)).toEqual([
      "eau",
      "a",
      "b",
      "pomme",
    ]);
  });
});
