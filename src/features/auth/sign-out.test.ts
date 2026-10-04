import { QueryClient } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { countPendingChanges, signOutAndClear } from "@/features/auth/sign-out";
import { useLastListStore } from "@/features/lists/last-list-store";
import { persister } from "@/lib/query-client";
import { supabase } from "@/lib/supabase";

vi.mock("@/lib/supabase", () => ({
  supabase: { auth: { signOut: vi.fn(async () => ({ error: null })) } },
}));
vi.mock("@/lib/query-client", () => ({
  persister: { removeClient: vi.fn(async () => undefined) },
}));

const LIST_ID = "6f1c2b8e-3d4a-4f5b-9c6d-7e8f9a0b1c2d";

describe("signOutAndClear (CPT-07)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("signs out locally and clears the cache, the queue and the last list", async () => {
    const client = new QueryClient();
    client.setQueryData(["lists", "me"], [{ id: LIST_ID }]);
    client.getMutationCache().build(client, { mutationKey: ["lists", "update"] });
    useLastListStore.getState().setLastListId(LIST_ID);

    await signOutAndClear(client);

    expect(supabase.auth.signOut).toHaveBeenCalledWith({ scope: "local" });
    expect(client.getQueryCache().getAll()).toHaveLength(0);
    expect(client.getMutationCache().getAll()).toHaveLength(0);
    expect(persister.removeClient).toHaveBeenCalled();
    expect(useLastListStore.getState().lastListId).toBeNull();
  });
});

describe("countPendingChanges", () => {
  it("counts the changes waiting for the network", async () => {
    const client = new QueryClient();
    const cache = client.getMutationCache();
    expect(countPendingChanges(client)).toBe(0);
    const idle = cache.build(client, { mutationKey: ["lists", "update"] });
    cache.build(
      client,
      { mutationKey: ["lists", "update"] },
      {
        ...idle.state,
        status: "pending",
        isPaused: true,
      },
    );
    expect(countPendingChanges(client)).toBe(1);
  });
});
