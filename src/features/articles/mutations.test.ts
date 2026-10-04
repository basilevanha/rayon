import { QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  articleMutationKeys,
  registerArticleMutations,
  type CreateArticleVariables,
  type DeleteArticleVariables,
  type SetStatusVariables,
} from "@/features/articles/mutations";
import { articleKeys } from "@/features/articles/queries";
import type { Article } from "@/features/articles/schemas";
import { listKeys, listMutationKeys, registerListMutations } from "@/features/lists/mutations";
import type { ListSummary } from "@/features/lists/schemas";
import { i18n } from "@/lib/i18n";
import { supabase } from "@/lib/supabase";

vi.mock("@/lib/supabase", () => ({
  supabase: {
    rpc: vi.fn(),
    from: vi.fn(),
    // Session du compte de test (USER_ID) : les écritures sont faites en son nom.
    auth: {
      getSession: vi.fn(async () => ({
        data: { session: { user: { id: "1a2b3c4d-5e6f-4a8b-9c0d-1e2f3a4b5c6d" } } },
        error: null,
      })),
    },
  },
}));
vi.mock("sonner", () => ({ toast: Object.assign(vi.fn(), { error: vi.fn() }) }));

const rpc = vi.mocked(supabase.rpc);
const from = vi.mocked(supabase.from);

const USER_ID = "1a2b3c4d-5e6f-4a8b-9c0d-1e2f3a4b5c6d";
const OTHER_ID = "0b9f8e7d-6c5b-4a39-8281-7f6e5d4c3b2a";
const LIST_ID = "6f1c2b8e-3d4a-4f5b-9c6d-7e8f9a0b1c2d";
const OTHER_LIST_ID = "5e0b1a7d-2c3b-4e4a-8b5c-6d7e8f9a0b1c";
const RAYON_ID = "2b3c4d5e-6f7a-4b8c-9d0e-1f2a3b4c5d6e";
const NEW_ID = "9d8c7b6a-5f4e-4d3c-8b2a-1f0e9d8c7b6a";

const lait: Article = {
  id: "7a6b5c4d-3e2f-4a1b-8c9d-0e1f2a3b4c5d",
  listId: LIST_ID,
  name: "Lait",
  normalizedName: "lait",
  rayonId: RAYON_ID,
  status: "catalogue",
  statusBy: OTHER_ID,
  quantity: null,
  updatedBy: OTHER_ID,
  updatedAt: "2026-10-01T10:00:00Z",
};
const maison: ListSummary = {
  id: LIST_ID,
  name: "Maison",
  emoji: "🏠",
  activity_at: "2026-10-01T10:00:00+00:00",
};
const bureau: ListSummary = {
  id: OTHER_LIST_ID,
  name: "Bureau",
  emoji: "🏢",
  activity_at: "2026-10-02T10:00:00+00:00",
};

// Réponse contrôlée par le test, pour observer l'état optimiste avant la fin.
function deferred<T>(result: { data: T; error: unknown }) {
  let resolve!: () => void;
  const done = new Promise<void>((r) => (resolve = r));
  return { promise: done.then(() => result), resolve };
}

function setup(articles: Article[] = [lait]) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  registerListMutations(client);
  registerArticleMutations(client);
  client.setQueryData(articleKeys.all(USER_ID), articles);
  client.setQueryData(listKeys.all(USER_ID), [bureau, maison]);
  const run = <T>(mutationKey: readonly string[], variables: T) =>
    client.getMutationCache().build(client, { mutationKey }).execute(variables);
  const articlesOf = () => client.getQueryData<Article[]>(articleKeys.all(USER_ID)) ?? [];
  return { client, run, articlesOf };
}

const create = (patch: Partial<CreateArticleVariables> = {}): CreateArticleVariables => ({
  userId: USER_ID,
  listId: LIST_ID,
  articleId: NEW_ID,
  name: "Pain",
  rayonId: RAYON_ID,
  quantity: null,
  ...patch,
});

describe("article mutations (OFF-02)", () => {
  beforeEach(() => {
    rpc.mockReset();
    from.mockReset();
    vi.mocked(toast).mockClear();
    vi.mocked(toast.error).mockClear();
  });

  it("creates an article optimistically, to buy, and lifts its list (ART-03, NAV-06)", async () => {
    const { client, run, articlesOf } = setup();
    const response = deferred({ data: [{ article_id: NEW_ID, merged: false }], error: null });
    rpc.mockReturnValueOnce(response.promise as unknown as ReturnType<typeof supabase.rpc>);

    const pending = run(articleMutationKeys.create, create({ name: "  Pain ", quantity: 2 }));
    await vi.waitFor(() => expect(rpc).toHaveBeenCalled());

    expect(articlesOf().find((a) => a.id === NEW_ID)).toMatchObject({
      name: "Pain",
      normalizedName: "pain",
      status: "a_acheter",
      statusBy: USER_ID,
      quantity: 2,
    });
    expect(client.getQueryData<ListSummary[]>(listKeys.all(USER_ID))?.[0].id).toBe(LIST_ID);
    expect(rpc).toHaveBeenCalledWith("creer_article", {
      p_id: NEW_ID,
      p_list_id: LIST_ID,
      p_name: "  Pain ",
      p_rayon_id: RAYON_ID,
      p_quantity: 2,
    });
    response.resolve();
    await pending;
    expect(toast).not.toHaveBeenCalled();
  });

  it("merges a duplicate on screen instead of creating it, and says so (ART-04)", async () => {
    const { run, articlesOf } = setup();
    rpc.mockResolvedValueOnce({
      data: [{ article_id: lait.id, merged: true }],
      error: null,
    } as never);

    await run(articleMutationKeys.create, create({ name: "LAITS", quantity: 3 }));

    expect(articlesOf()).toHaveLength(1);
    expect(articlesOf()[0]).toMatchObject({ id: lait.id, status: "a_acheter", quantity: 3 });
    expect(toast).toHaveBeenCalledTimes(1);
    expect(toast).toHaveBeenCalledWith(i18n.t("search:alreadyInList", { name: "Lait" }));
  });

  it("keeps a duplicate in the cart (ART-04, OFF-05)", async () => {
    const { run, articlesOf } = setup([{ ...lait, status: "caddie", quantity: 1 }]);
    const response = deferred({ data: [{ article_id: lait.id, merged: true }], error: null });
    rpc.mockReturnValueOnce(response.promise as unknown as ReturnType<typeof supabase.rpc>);

    const pending = run(articleMutationKeys.create, create({ name: "Lait" }));
    await vi.waitFor(() => expect(rpc).toHaveBeenCalled());
    expect(articlesOf()[0]).toMatchObject({ status: "caddie", quantity: 1, statusBy: OTHER_ID });
    response.resolve();
    await pending;
  });

  it("reports a duplicate found by the server only, on replay (OFF-05)", async () => {
    const { run } = setup([]);
    rpc.mockResolvedValueOnce({
      data: [{ article_id: lait.id, merged: true }],
      error: null,
    } as never);
    await run(articleMutationKeys.create, create({ name: "Lait" }));
    expect(toast).toHaveBeenCalledWith(i18n.t("search:alreadyInList", { name: "Lait" }));
  });

  it("rolls back a refused creation and reports it (OFF-02)", async () => {
    const { client, run, articlesOf } = setup();
    rpc.mockResolvedValueOnce({ data: null, error: { message: "non_membre" } } as never);
    await expect(run(articleMutationKeys.create, create())).rejects.toBeTruthy();
    expect(articlesOf()).toEqual([lait]);
    expect(client.getQueryData<ListSummary[]>(listKeys.all(USER_ID))?.[0].id).toBe(OTHER_LIST_ID);
    expect(toast.error).toHaveBeenCalledWith(i18n.t("articles:errors.notMember"));
  });

  it("sets the status without toggling, and empties the quantity in the catalogue (COU-10, ART-02)", async () => {
    const { run, articlesOf } = setup([{ ...lait, status: "a_acheter", quantity: 4 }]);
    rpc.mockResolvedValue({ data: null, error: null } as never);
    const variables: SetStatusVariables = {
      userId: USER_ID,
      listId: LIST_ID,
      articleId: lait.id,
      status: "catalogue",
      seenStatus: "a_acheter",
    };
    await run(articleMutationKeys.setStatus, variables);
    await run(articleMutationKeys.setStatus, variables);
    expect(articlesOf()[0]).toMatchObject({ status: "catalogue", quantity: null });
    expect(rpc).toHaveBeenCalledWith("set_status", {
      p_article_id: lait.id,
      p_status: "catalogue",
      p_seen_status: "a_acheter",
    });
  });

  it("explains a removal refused on replay: another member put it in the cart (OFF-04)", async () => {
    const { client, run, articlesOf } = setup([{ ...lait, status: "a_acheter" }]);
    client.setQueryData(listKeys.detail(LIST_ID), {
      ...maison,
      members: [
        {
          userId: USER_ID,
          joinedAt: "2026-10-01T10:00:00Z",
          isCreator: true,
          displayName: "Alice",
        },
        {
          userId: OTHER_ID,
          joinedAt: "2026-10-02T10:00:00Z",
          isCreator: false,
          displayName: "Bob",
        },
      ],
    });
    rpc.mockResolvedValueOnce({
      data: null,
      error: { message: "deja_au_caddie", code: "P0001", details: OTHER_ID },
    } as never);
    await expect(
      run(articleMutationKeys.setStatus, {
        userId: USER_ID,
        listId: LIST_ID,
        articleId: lait.id,
        status: "catalogue",
        seenStatus: "a_acheter",
      } satisfies SetStatusVariables),
    ).rejects.toBeTruthy();
    expect(articlesOf()[0].status).toBe("a_acheter");
    expect(toast.error).toHaveBeenCalledWith(
      i18n.t("articles:errors.alreadyInCart", { name: "Lait", member: "Bob" }),
    );
  });

  it("deletes softly, then restores (ART-08)", async () => {
    const { run, articlesOf } = setup();
    rpc.mockResolvedValueOnce({ data: null, error: null } as never);
    const eq = vi.fn().mockResolvedValue({ data: null, error: null });
    const update = vi.fn(() => ({ eq }));
    from.mockReturnValue({ update } as unknown as ReturnType<typeof supabase.from>);
    const variables: DeleteArticleVariables = { userId: USER_ID, listId: LIST_ID, article: lait };

    await run(articleMutationKeys.delete, variables);
    expect(articlesOf()).toEqual([]);
    expect(rpc).toHaveBeenCalledWith("supprimer_article", {
      p_article_id: lait.id,
      p_seen_status: "catalogue",
    });

    await run(articleMutationKeys.restore, variables);
    expect(articlesOf()).toMatchObject([{ id: lait.id }]);
    expect(update).toHaveBeenLastCalledWith({ deleted_at: null });
  });

  it("reports a restore refused because the name is taken again (ART-08)", async () => {
    const { run, articlesOf } = setup([]);
    const eq = vi.fn().mockResolvedValue({ data: null, error: { code: "23505", message: "dup" } });
    from.mockReturnValue({ update: () => ({ eq }) } as unknown as ReturnType<typeof supabase.from>);
    await expect(
      run(articleMutationKeys.restore, { userId: USER_ID, listId: LIST_ID, article: lait }),
    ).rejects.toBeTruthy();
    expect(articlesOf()).toEqual([]);
    expect(toast.error).toHaveBeenCalledWith(i18n.t("articles:errors.duplicateName"));
  });

  it("replays a list creation before the articles added to it (OFF-02)", async () => {
    const { run } = setup([]);
    const order: string[] = [];
    rpc.mockImplementation((async (fn: string) => {
      order.push(`${fn}:start`);
      await new Promise((resolve) => setTimeout(resolve, 10));
      order.push(`${fn}:end`);
      return {
        data: fn === "creer_article" ? [{ article_id: NEW_ID, merged: false }] : null,
        error: null,
      };
    }) as unknown as typeof supabase.rpc);

    await Promise.all([
      run(listMutationKeys.create, {
        userId: USER_ID,
        listId: LIST_ID,
        name: "Maison",
        emoji: "🏠",
        displayName: "Alice",
      }),
      run(articleMutationKeys.create, create()),
    ]);
    expect(order).toEqual([
      "creer_liste:start",
      "creer_liste:end",
      "creer_article:start",
      "creer_article:end",
    ]);
  });
});
