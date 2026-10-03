import { describe, expect, it } from "vitest";
import { pageTransition } from "@/lib/page-transition";

const LIST = "/listes/6f1c2b8e-3d4a-4f5b-9c6d-7e8f9a0b1c2d";
const OTHER = "/listes/0b9f8e7d-6c5b-4a39-8281-7f6e5d4c3b2a";

describe("pageTransition", () => {
  it("pushes from « Mes listes » into a list", () => {
    expect(pageTransition("/listes", LIST)).toBe("push");
  });

  it("pops back from a list, or from its settings, to « Mes listes »", () => {
    expect(pageTransition(LIST, "/listes")).toBe("pop");
    expect(pageTransition(`${LIST}/reglages`, "/listes")).toBe("pop");
  });

  it("does not animate the settings panel, which has its own animation", () => {
    expect(pageTransition(LIST, `${LIST}/reglages`)).toBeNull();
    expect(pageTransition(`${LIST}/reglages`, LIST)).toBeNull();
  });

  it("does not animate a switch between two lists (drawer)", () => {
    expect(pageTransition(LIST, OTHER)).toBeNull();
  });

  it("ignores pages outside the list navigation", () => {
    expect(pageTransition(undefined, "/listes")).toBeNull();
    expect(pageTransition("/", LIST)).toBeNull();
    expect(pageTransition("/connexion", "/listes")).toBeNull();
    expect(pageTransition("/bienvenue", "/listes")).toBeNull();
  });

  it("ignores a trailing slash", () => {
    expect(pageTransition("/listes/", LIST)).toBe("push");
  });
});
