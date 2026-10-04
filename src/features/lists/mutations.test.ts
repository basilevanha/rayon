import { QueryClient } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  listKeys,
  listMutationKeys,
  registerListMutations,
  type CreateListVariables,
  type LeaveListVariables,
  type RemoveMemberVariables,
} from "@/features/lists/mutations";
import type { ListDetail, ListSummary } from "@/features/lists/schemas";
import { supabase } from "@/lib/supabase";

vi.mock("@/lib/supabase", () => ({ supabase: { rpc: vi.fn(), from: vi.fn() } }));

const rpc = vi.mocked(supabase.rpc);
const from = vi.mocked(supabase.from);

const USER_ID = "1a2b3c4d-5e6f-4a8b-9c0d-1e2f3a4b5c6d";
const OTHER_ID = "0b9f8e7d-6c5b-4a39-8281-7f6e5d4c3b2a";
const LIST_ID = "6f1c2b8e-3d4a-4f5b-9c6d-7e8f9a0b1c2d";
const NEW_ID = "9d8c7b6a-5f4e-4d3c-8b2a-1f0e9d8c7b6a";

const maison: ListSummary = {
  id: LIST_ID,
  name: "Maison",
  emoji: "🏠",
  activity_at: "2026-10-01T10:00:00+00:00",
};
const maisonDetail: ListDetail = {
  ...maison,
  members: [
    { userId: USER_ID, joinedAt: "2026-10-01T10:00:00Z", isCreator: true, displayName: "Alice" },
    { userId: OTHER_ID, joinedAt: "2026-10-02T10:00:00Z", isCreator: false, displayName: "Bob" },
  ],
};

// Réponse RPC contrôlée par le test, pour observer l'état optimiste avant la fin.
function deferredRpc(error: { message: string } | null = null) {
  let resolve!: () => void;
  const done = new Promise<void>((r) => (resolve = r));
  rpc.mockImplementationOnce(
    () => done.then(() => ({ data: null, error })) as unknown as ReturnType<typeof supabase.rpc>,
  );
  return resolve;
}

function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  registerListMutations(client);
  client.setQueryData(listKeys.all(USER_ID), [maison]);
  client.setQueryData(listKeys.detail(LIST_ID), maisonDetail);
  const run = <T>(mutationKey: readonly string[], variables: T) =>
    client.getMutationCache().build(client, { mutationKey }).execute(variables);
  return { client, run };
}

describe("list mutations (OFF-02)", () => {
  beforeEach(() => {
    rpc.mockReset();
    from.mockReset();
  });

  it("runs list mutations one after another, in order (OFF-02)", async () => {
    const { run } = setup();
    const order: string[] = [];
    rpc.mockImplementationOnce((async () => {
      order.push("create:start");
      await new Promise((resolve) => setTimeout(resolve, 20));
      order.push("create:end");
      return { data: null, error: null };
    }) as unknown as typeof supabase.rpc);
    from.mockReturnValue({
      update: () => ({
        eq: async () => {
          order.push("update");
          return { data: null, error: null };
        },
      }),
    } as unknown as ReturnType<typeof supabase.from>);

    await Promise.all([
      run(listMutationKeys.create, {
        userId: USER_ID,
        listId: NEW_ID,
        name: "Apéro",
        emoji: "🎉",
        displayName: "Alice",
      } satisfies CreateListVariables),
      run(listMutationKeys.update, {
        userId: USER_ID,
        listId: NEW_ID,
        name: "Apéro du soir",
        emoji: "🎉",
      }),
    ]);

    expect(order).toEqual(["create:start", "create:end", "update"]);
  });

  it("creates a list optimistically, first in the list (NAV-06), with its creator (LST-01)", async () => {
    const { client, run } = setup();
    const resolve = deferredRpc();
    const variables: CreateListVariables = {
      userId: USER_ID,
      listId: NEW_ID,
      name: "Vacances",
      emoji: "🎉",
      displayName: "Alice",
    };
    const pending = run(listMutationKeys.create, variables);
    await vi.waitFor(() => expect(rpc).toHaveBeenCalled());

    // NAV-06 : la nouvelle liste est la plus récemment active.
    expect(client.getQueryData<ListSummary[]>(listKeys.all(USER_ID))?.map((l) => l.id)).toEqual([
      NEW_ID,
      LIST_ID,
    ]);
    expect(client.getQueryData<ListDetail>(listKeys.detail(NEW_ID))?.members).toMatchObject([
      { userId: USER_ID, isCreator: true, displayName: "Alice" },
    ]);
    expect(rpc).toHaveBeenCalledWith("creer_liste", {
      p_id: NEW_ID,
      p_name: "Vacances",
      p_emoji: "🎉",
    });
    resolve();
    await pending;
  });

  it("rolls back a failed creation", async () => {
    const { client, run } = setup();
    const resolve = deferredRpc({ message: "boom" });
    const pending = run(listMutationKeys.create, {
      userId: USER_ID,
      listId: NEW_ID,
      name: "Apéro",
      emoji: "🎉",
      displayName: "Alice",
    } satisfies CreateListVariables);
    resolve();
    await expect(pending).rejects.toMatchObject({ message: "boom" });

    expect(client.getQueryData(listKeys.all(USER_ID))).toEqual([maison]);
    expect(client.getQueryData(listKeys.detail(NEW_ID))).toBeUndefined();
  });

  it("removes a left list from the drawer immediately (LST-07, LST-08)", async () => {
    const { client, run } = setup();
    const resolve = deferredRpc();
    const pending = run(listMutationKeys.leave, {
      userId: USER_ID,
      listId: LIST_ID,
    } satisfies LeaveListVariables);
    await vi.waitFor(() =>
      expect(rpc).toHaveBeenCalledWith("quitter_liste", { p_list_id: LIST_ID }),
    );

    expect(client.getQueryData(listKeys.all(USER_ID))).toEqual([]);
    resolve();
    await pending;
  });

  it("removes a member immediately and restores it on failure (LST-06)", async () => {
    const { client, run } = setup();
    const resolve = deferredRpc({ message: "reserve_au_createur" });
    const pending = run(listMutationKeys.removeMember, {
      listId: LIST_ID,
      memberId: OTHER_ID,
    } satisfies RemoveMemberVariables);
    await vi.waitFor(() =>
      expect(rpc).toHaveBeenCalledWith("retirer_membre", {
        p_list_id: LIST_ID,
        p_user_id: OTHER_ID,
      }),
    );

    expect(client.getQueryData<ListDetail>(listKeys.detail(LIST_ID))?.members).toHaveLength(1);
    resolve();
    await expect(pending).rejects.toBeDefined();
    expect(client.getQueryData<ListDetail>(listKeys.detail(LIST_ID))?.members).toHaveLength(2);
  });
});
