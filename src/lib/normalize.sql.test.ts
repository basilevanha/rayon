import { describe, expect, it } from "vitest";
import { normalizeCases } from "@/lib/normalize.cases";
import sqlTest from "../../supabase/tests/normaliser_nom.test.sql?raw";

// REC-02 : la version SQL (normaliser_nom) est testée sur les mêmes cas que la version TS.
// Tabulation et espace insécable sont écrites en échappement E'' dans le test SQL.
function sqlLiteral(value: string): string {
  const quoted = value.replaceAll("'", "''");
  if (!/[\t\u00a0]/.test(value)) return `'${quoted}'`;
  return `E'${quoted.replaceAll("\t", "\\t").replaceAll("\u00a0", "\\u00a0")}'`;
}

describe("normaliser_nom.test.sql", () => {
  it("covers every shared case", () => {
    for (const [input, expected] of normalizeCases) {
      expect(sqlTest).toContain(`(${sqlLiteral(input)}, ${sqlLiteral(expected)})`);
    }
  });

  it("plans one assertion per case", () => {
    expect(sqlTest).toContain(`select plan(${normalizeCases.length});`);
  });
});
