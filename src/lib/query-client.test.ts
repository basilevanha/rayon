import { dehydrate, hydrate, QueryClient } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import {
  deserializeCache,
  resumePendingMutations,
  shouldDehydrateMutation,
} from "@/lib/query-client";

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

describe("pending mutations across a restart (OFF-02)", () => {
  it("persists a change being sent, not only a paused one", async () => {
    const client = new QueryClient();
    let release!: () => void;
    const sending = client
      .getMutationCache()
      .build(client, {
        mutationKey: ["test"],
        mutationFn: () => new Promise<void>((resolve) => (release = resolve)),
      })
      .execute(undefined);
    await vi.waitFor(() => expect(release).toBeDefined());

    const { mutations } = dehydrate(client, { shouldDehydrateMutation });
    expect(mutations).toHaveLength(1);
    expect(mutations[0].state.isPaused).toBe(false);
    release();
    await sending;
  });

  it("resumes every restored pending change, paused or not", async () => {
    const source = new QueryClient();
    let release!: () => void;
    void source
      .getMutationCache()
      .build(source, {
        mutationKey: ["test"],
        mutationFn: () => new Promise<void>((resolve) => (release = resolve)),
      })
      .execute("lait");
    await vi.waitFor(() => expect(release).toBeDefined());
    const state = dehydrate(source, { shouldDehydrateMutation });

    const restored = new QueryClient();
    const mutationFn = vi.fn().mockResolvedValue(undefined);
    restored.setMutationDefaults(["test"], { mutationFn });
    hydrate(restored, state);
    await resumePendingMutations(restored);
    expect(mutationFn).toHaveBeenCalledWith("lait", expect.anything());
    release();
  });
});
