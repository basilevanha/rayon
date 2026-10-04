import { describe, expect, it } from "vitest";
import {
  applyPlacement,
  countPlacedElsewhere,
  dropRedundantPlacements,
  mergeRemotePlacement,
  placementsForStore,
  type Placement,
} from "@/lib/placements";

const bananes = { id: "bananes", listId: "maison", rayonId: "fruits" };

const placement = (articleId: string, storeId: string, rayonId: string): Placement => ({
  articleId,
  storeId,
  listId: "maison",
  rayonId,
});

const colruyt = placement("bananes", "colruyt", "patates");
const delhaize = placement("bananes", "delhaize", "autre");
const laitDelhaize = placement("lait", "delhaize", "fruits");

describe("applyPlacement (ART-07, RNG-02)", () => {
  it("creates a placement in the selected store, without changing the rayon", () => {
    expect(
      applyPlacement([], { article: bananes, storeId: "colruyt", rayonId: "patates" }),
    ).toEqual({
      placements: [colruyt],
      rayonId: "fruits",
    });
  });

  it("replaces the placement of the same store", () => {
    const result = applyPlacement([colruyt, delhaize], {
      article: bananes,
      storeId: "colruyt",
      rayonId: "eaux",
    });
    expect(result.placements).toEqual([delhaize, placement("bananes", "colruyt", "eaux")]);
  });

  it("removes a placement equal to the article's rayon (RNG-02)", () => {
    const result = applyPlacement([colruyt, delhaize], {
      article: bananes,
      storeId: "colruyt",
      rayonId: "fruits",
    });
    expect(result).toEqual({ placements: [delhaize], rayonId: "fruits" });
  });

  it("« Dans tous les magasins » changes the rayon and clears the placements", () => {
    const result = applyPlacement([colruyt, delhaize, laitDelhaize], {
      article: bananes,
      storeId: "colruyt",
      rayonId: "eaux",
      everywhere: true,
    });
    expect(result).toEqual({ placements: [laitDelhaize], rayonId: "eaux" });
  });

  it("« Dans tous les magasins » works without a store", () => {
    const result = applyPlacement([colruyt], {
      article: bananes,
      storeId: null,
      rayonId: "eaux",
      everywhere: true,
    });
    expect(result).toEqual({ placements: [], rayonId: "eaux" });
  });

  it("keeps the same array when nothing changes", () => {
    const placements = [colruyt];
    expect(
      applyPlacement(placements, { article: bananes, storeId: "colruyt", rayonId: "patates" })
        .placements,
    ).toBe(placements);
  });
});

describe("dropRedundantPlacements (RNG-02)", () => {
  it("removes the placements equal to the new rayon, and only those", () => {
    expect(dropRedundantPlacements([colruyt, delhaize, laitDelhaize], "bananes", "autre")).toEqual([
      colruyt,
      laitDelhaize,
    ]);
  });

  it("keeps the same array when nothing is redundant", () => {
    const placements = [colruyt];
    expect(dropRedundantPlacements(placements, "bananes", "eaux")).toBe(placements);
  });
});

describe("placementsForStore (RNG-01)", () => {
  it("maps each article to its rayon in the store", () => {
    expect(placementsForStore([colruyt, delhaize, laitDelhaize], "delhaize")).toEqual(
      new Map([
        ["bananes", "autre"],
        ["lait", "fruits"],
      ]),
    );
  });

  it("is empty for the « Défaut » view", () => {
    expect(placementsForStore([colruyt], null).size).toBe(0);
  });
});

describe("countPlacedElsewhere (ART-07)", () => {
  it("counts the stores where the article has a placement", () => {
    expect(countPlacedElsewhere([colruyt, delhaize, laitDelhaize], "bananes")).toBe(2);
    expect(countPlacedElsewhere([colruyt], "lait")).toBe(0);
  });
});

describe("mergeRemotePlacement (COL-01)", () => {
  it("adds a new placement", () => {
    expect(mergeRemotePlacement([delhaize], colruyt)).toEqual([delhaize, colruyt]);
  });

  it("replaces the placement of the same article and store", () => {
    const moved = placement("bananes", "colruyt", "eaux");
    expect(mergeRemotePlacement([colruyt, delhaize], moved)).toEqual([delhaize, moved]);
  });

  it("removes a placement whose rayon is empty", () => {
    expect(mergeRemotePlacement([colruyt, delhaize], { ...colruyt, rayonId: null })).toEqual([
      delhaize,
    ]);
  });

  it("keeps the same array when the placement is already known", () => {
    const placements = [colruyt];
    expect(mergeRemotePlacement(placements, { ...colruyt })).toBe(placements);
    expect(mergeRemotePlacement(placements, { ...delhaize, rayonId: null })).toBe(placements);
  });
});
