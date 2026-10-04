import { describe, expect, it } from "vitest";
import { moveRayon } from "@/lib/store-order";

const order = ["fruits", "patates", "laitiers", "eaux", "autre"];

describe("moveRayon (DIS-02)", () => {
  it("moves a rayon down", () => {
    expect(moveRayon(order, "fruits", 2)).toEqual([
      "patates",
      "laitiers",
      "fruits",
      "eaux",
      "autre",
    ]);
  });

  it("moves a rayon up", () => {
    expect(moveRayon(order, "eaux", 0)).toEqual(["eaux", "fruits", "patates", "laitiers", "autre"]);
  });

  it("moves a rayon to the end", () => {
    expect(moveRayon(order, "fruits", 4)).toEqual([
      "patates",
      "laitiers",
      "eaux",
      "autre",
      "fruits",
    ]);
  });

  it("clamps an index out of range", () => {
    expect(moveRayon(order, "fruits", 99)).toEqual([
      "patates",
      "laitiers",
      "eaux",
      "autre",
      "fruits",
    ]);
    expect(moveRayon(order, "autre", -3)).toEqual([
      "autre",
      "fruits",
      "patates",
      "laitiers",
      "eaux",
    ]);
  });

  it("returns the same order when nothing moves", () => {
    expect(moveRayon(order, "laitiers", 2)).toBe(order);
  });

  it("returns the same order for an unknown rayon", () => {
    expect(moveRayon(order, "inconnu", 0)).toBe(order);
  });
});
