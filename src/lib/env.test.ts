import { describe, expect, it } from "vitest";
import { parseEnv } from "@/lib/env";

const valid = {
  VITE_SUPABASE_URL: "http://127.0.0.1:55321",
  VITE_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_abc",
};

describe("parseEnv", () => {
  it("accepts a valid environment", () => {
    expect(parseEnv(valid)).toEqual(valid);
  });

  it("rejects an invalid URL", () => {
    expect(() => parseEnv({ ...valid, VITE_SUPABASE_URL: "pas-une-url" })).toThrow();
  });

  it("rejects an empty key", () => {
    expect(() => parseEnv({ ...valid, VITE_SUPABASE_PUBLISHABLE_KEY: "" })).toThrow();
  });

  it("rejects a secret key", () => {
    expect(() => parseEnv({ ...valid, VITE_SUPABASE_PUBLISHABLE_KEY: "sb_secret_abc" })).toThrow();
  });
});
