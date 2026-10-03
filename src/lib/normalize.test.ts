import { describe, expect, it } from "vitest";
import { normalizeName } from "@/lib/normalize";
import { normalizeCases } from "@/lib/normalize.cases";

describe("normalizeName (REC-02)", () => {
  it.each(normalizeCases)("%j → %j", (input, expected) => {
    expect(normalizeName(input)).toBe(expected);
  });

  it("counts letters only, before removing the final s or x", () => {
    expect(normalizeName("Bas")).toBe("bas");
    expect(normalizeName("Gâts")).toBe("gat");
    expect(normalizeName("12s")).toBe("12s");
  });

  it("removes a single final letter", () => {
    expect(normalizeName("Express")).toBe("expres");
  });

  it("matches singular and plural forms", () => {
    expect(normalizeName("Carotte")).toBe(normalizeName("carottes"));
    expect(normalizeName("Chou")).toBe(normalizeName("CHOUX"));
  });
});
