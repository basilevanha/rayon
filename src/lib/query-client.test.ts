import { describe, expect, it } from "vitest";
import { deserializeCache } from "@/lib/query-client";

const valid = {
  timestamp: 1,
  buster: "0.0.0",
  clientState: { queries: [], mutations: [] },
};

describe("deserializeCache", () => {
  it("accepts a valid persisted client", () => {
    expect(deserializeCache(JSON.stringify(valid))).toEqual(valid);
  });

  it("ignores corrupted JSON", () => {
    expect(deserializeCache("{pas du json")).toEqual({
      timestamp: 0,
      buster: "",
      clientState: { queries: [], mutations: [] },
    });
  });

  it("ignores an unexpected shape", () => {
    expect(deserializeCache(JSON.stringify({ foo: 1 })).clientState.queries).toEqual([]);
  });
});
