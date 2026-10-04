import { describe, expect, it } from "vitest";
import { resources } from "@/lib/i18n/resources";

type Tree = { [key: string]: string | Tree };

function flatten(tree: Tree, prefix = ""): Record<string, string> {
  return Object.entries(tree).reduce<Record<string, string>>((acc, [key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return typeof value === "string"
      ? { ...acc, [path]: value }
      : { ...acc, ...flatten(value, path) };
  }, {});
}

const languages = Object.entries(resources) as [string, Record<string, Tree>][];
const reference = flatten(resources.fr as unknown as Tree);

describe("i18n resources", () => {
  it("has no empty namespace and no empty text", () => {
    for (const [namespace, tree] of Object.entries(resources.fr)) {
      const entries = Object.values(flatten(tree as unknown as Tree));
      expect(entries.length, namespace).toBeGreaterThan(0);
      for (const text of entries) expect(text.trim(), namespace).not.toBe("");
    }
  });

  it("gives every language exactly the same keys as French", () => {
    for (const [language, namespaces] of languages) {
      expect(Object.keys(flatten(namespaces as unknown as Tree)).sort(), language).toEqual(
        Object.keys(reference).sort(),
      );
    }
  });
});
