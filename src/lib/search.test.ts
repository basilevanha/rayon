import { describe, expect, it } from "vitest";
import { createSearchIndex, searchArticles, type SearchArticle } from "@/lib/search";

const names = [
  "Lait",
  "Lait d'avoine",
  "Chocolat au lait",
  "Lessive",
  "Yaourt nature",
  "Œufs ×12",
  "Pâtes",
  "Pommes de terre",
  "Riz",
  "Poivre",
  "Poire",
  "Pain-surprise",
  "Petits pois",
];
const articles: SearchArticle[] = names.map((name, i) => ({ id: `a${i}`, name }));
const index = createSearchIndex(articles);

const found = (query: string) => searchArticles(index, query).results.map((r) => r.article.name);

describe("searchArticles (REC-01 à REC-03, REC-07)", () => {
  it("returns nothing for an empty query", () => {
    expect(searchArticles(index, "   ")).toEqual({ results: [], canCreate: false });
  });

  it("shows results from the first character, by word prefix", () => {
    expect(found("l")).toEqual(["Lait", "Lait d'avoine", "Lessive", "Chocolat au lait"]);
  });

  it("compares normalized forms (REC-02)", () => {
    expect(found("OEUF")).toEqual(["Œufs ×12"]);
    expect(found("pâte")).toEqual(["Pâtes"]);
    expect(found("pates")).toEqual(["Pâtes"]);
  });

  it("matches any word of the name, including after an apostrophe or a hyphen", () => {
    expect(found("avoine")).toEqual(["Lait d'avoine"]);
    expect(found("terre")).toEqual(["Pommes de terre"]);
    expect(found("surpri")).toEqual(["Pain-surprise"]);
  });

  it("requires every word of the query", () => {
    expect(found("lait avo")).toEqual(["Lait d'avoine"]);
    expect(found("d'avoine")).toEqual(["Lait d'avoine"]);
    expect(found("avoine lait")).toEqual(["Lait d'avoine"]);
  });

  it("tolerates one typo in words of 4 letters or more (REC-03)", () => {
    expect(found("yaourr")).toEqual(["Yaourt nature"]); // substitution
    expect(found("yaurt")).toEqual(["Yaourt nature"]); // omission
    expect(found("yaoourt")).toEqual(["Yaourt nature"]); // insertion
    expect(found("lesisve")).toEqual(["Lessive"]); // transposition
  });

  it("counts the letters of a typed word before removing its plural (REC-02)", () => {
    // « piis » keeps its 4 letters, so one typo is tolerated (« pii » would allow none).
    expect(found("piis")).toContain("Petits pois");
  });

  it("marks a result approximate when one word of the query has a typo", () => {
    expect(
      searchArticles(index, "lait avoime").results.map((r) => [r.article.name, r.exact]),
    ).toEqual([["Lait d'avoine", false]]);
  });

  it("does not tolerate a typo in words of fewer than 4 letters", () => {
    expect(found("rzi")).toEqual([]);
    expect(found("lat")).toEqual([]);
  });

  it("does not tolerate two typos in a word", () => {
    expect(found("yuorrt")).toEqual([]);
  });

  it("ranks exact matches before approximate ones (REC-03)", () => {
    const { results } = searchArticles(index, "poivre");
    expect(results.map((r) => [r.article.name, r.exact])).toEqual([
      ["Poivre", true],
      ["Poire", false],
    ]);
  });

  it("ranks the same name first, then names starting with the query", () => {
    expect(found("lait")).toEqual(["Lait", "Lait d'avoine", "Chocolat au lait"]);
  });

  it("offers « Créer » unless an article has exactly the same normalized name (REC-07)", () => {
    expect(searchArticles(index, "Lait").canCreate).toBe(false);
    expect(searchArticles(index, " laits ").canCreate).toBe(false);
    expect(searchArticles(index, "lai").canCreate).toBe(true);
    expect(searchArticles(index, "Lait de soja").canCreate).toBe(true);
    expect(searchArticles(index, "Poivr").canCreate).toBe(true);
    expect(searchArticles(index, "yaourr").canCreate).toBe(true);
  });

  it("answers in less than 50 ms for 1 000 articles (REC-04)", () => {
    const words = ["lait", "pain", "pomme", "yaourt", "jambon", "lessive", "farine", "sucre"];
    const many: SearchArticle[] = Array.from({ length: 1000 }, (_, i) => ({
      id: `m${i}`,
      name: `${words[i % words.length]} ${words[(i * 7) % words.length]} ${i}`,
    }));
    const big = createSearchIndex(many);
    searchArticles(big, "warmup");
    const start = performance.now();
    for (const query of ["l", "yaourr", "pomme lait", "lessvie"]) searchArticles(big, query);
    expect(performance.now() - start).toBeLessThan(50);
  });
});
