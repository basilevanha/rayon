import { useMutation, type QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { z } from "zod";
import { articleErrorMessage } from "@/features/articles/errors";
import { articleKeys } from "@/features/articles/queries";
import type { Article } from "@/features/articles/schemas";
import { listKeys, sortLists } from "@/features/lists/queries";
import type { ListSummary } from "@/features/lists/schemas";
import type { ArticleStatus } from "@/lib/article-status";
import { mergeDuplicate } from "@/lib/conflicts";
import { i18n } from "@/lib/i18n";
import { normalizeName } from "@/lib/normalize";
import { supabase } from "@/lib/supabase";
import { SYNC_SCOPE } from "@/lib/sync-scope";

export const articleMutationKeys = {
  create: ["articles", "create"],
  setStatus: ["articles", "set-status"],
  update: ["articles", "update"],
  delete: ["articles", "delete"],
  restore: ["articles", "restore"],
} as const;

type Target = { userId: string; listId: string };

// ART-03, OFF-05 : l'id vient de l'appareil.
export type CreateArticleVariables = Target & {
  articleId: string;
  name: string;
  rayonId: string;
  quantity: number | null;
};
// COU-10 : le statut se fixe, il ne s'inverse jamais.
export type SetStatusVariables = Target & { articleId: string; status: ArticleStatus };
// ART-06, ART-07 : nom, quantité et rayon.
export type UpdateArticleVariables = Target & {
  articleId: string;
  name: string;
  rayonId: string;
  quantity: number | null;
};
// ART-08 : l'article supprimé est gardé dans les variables pour pouvoir l'annuler.
export type DeleteArticleVariables = Target & { article: Article };

type Snapshot = { articles: Article[] | undefined; lists: ListSummary[] | undefined };
type CreateContext = Snapshot & { knownDuplicate: boolean };

async function takeSnapshot(client: QueryClient, userId: string): Promise<Snapshot> {
  await client.cancelQueries({ queryKey: articleKeys.all(userId) });
  await client.cancelQueries({ queryKey: listKeys.all(userId) });
  return {
    articles: client.getQueryData(articleKeys.all(userId)),
    lists: client.getQueryData(listKeys.all(userId)),
  };
}

// OFF-02 : un refus au rejeu est toujours signalé, jamais silencieux.
function restoreSnapshot(client: QueryClient, userId: string, context: unknown, error: Error) {
  toast.error(i18n.t(articleErrorMessage(error)));
  const snapshot = context as Snapshot | undefined;
  if (!snapshot) return;
  client.setQueryData(articleKeys.all(userId), snapshot.articles);
  client.setQueryData(listKeys.all(userId), snapshot.lists);
}

function setArticles(
  client: QueryClient,
  userId: string,
  update: (articles: Article[]) => Article[],
) {
  client.setQueryData(articleKeys.all(userId), (old: Article[] | undefined) =>
    old ? update(old) : old,
  );
}

function patchArticle(
  client: QueryClient,
  userId: string,
  articleId: string,
  patch: (article: Article) => Partial<Article>,
) {
  const updatedAt = new Date().toISOString();
  setArticles(client, userId, (articles) =>
    articles.map((a) =>
      a.id === articleId ? { ...a, ...patch(a), updatedBy: userId, updatedAt } : a,
    ),
  );
}

// NAV-06 : toute écriture d'article fait remonter sa liste.
function touchList(client: QueryClient, { userId, listId }: Target) {
  const activity_at = new Date().toISOString();
  client.setQueryData(
    listKeys.all(userId),
    (old: ListSummary[] | undefined) =>
      old && sortLists(old.map((l) => (l.id === listId ? { ...l, activity_at } : l))),
  );
}

function invalidate(client: QueryClient, userId: string) {
  return Promise.all([
    client.invalidateQueries({ queryKey: articleKeys.all(userId) }),
    client.invalidateQueries({ queryKey: listKeys.all(userId) }),
  ]);
}

async function call<T>(request: PromiseLike<{ data: T; error: unknown }>): Promise<T> {
  const { data, error } = await request;
  if (error) throw error;
  return data;
}

const createResultSchema = z
  .array(z.object({ article_id: z.uuid(), merged: z.boolean() }))
  .length(1)
  .transform(([row]) => ({ articleId: row.article_id, merged: row.merged }));

// OFF-02 : enregistré avant la restauration du cache, pour rejouer les mutations en attente.
export function registerArticleMutations(client: QueryClient): void {
  // ART-03, ART-04, OFF-05 : pas de doublon. Un article de même nom passe à acheter (ou
  // reste au caddie) ; à l'écran comme au serveur, la règle est celle de mergeDuplicate.
  client.setMutationDefaults(articleMutationKeys.create, {
    scope: SYNC_SCOPE,
    mutationFn: async ({ articleId, listId, name, rayonId, quantity }: CreateArticleVariables) =>
      createResultSchema.parse(
        await call(
          supabase.rpc("creer_article", {
            p_id: articleId,
            p_list_id: listId,
            p_name: name,
            p_rayon_id: rayonId,
            p_quantity: quantity ?? undefined,
          }),
        ),
      ),
    onMutate: async (variables: CreateArticleVariables): Promise<CreateContext> => {
      const { userId, articleId, listId, name, rayonId, quantity } = variables;
      const snapshot = await takeSnapshot(client, userId);
      const normalizedName = normalizeName(name);
      const existing = snapshot.articles?.find(
        (a) => a.listId === listId && a.normalizedName === normalizedName,
      );
      const now = new Date().toISOString();
      if (existing) {
        const merged = mergeDuplicate(existing, { quantity });
        patchArticle(client, userId, existing.id, () => ({
          ...merged,
          statusBy: existing.status === "catalogue" ? userId : existing.statusBy,
        }));
        toast(i18n.t("search:alreadyInList", { name: existing.name }));
      } else {
        setArticles(client, userId, (articles) => [
          ...articles,
          {
            id: articleId,
            listId,
            name: name.trim(),
            normalizedName,
            rayonId,
            status: "a_acheter",
            statusBy: userId,
            quantity,
            updatedBy: userId,
            updatedAt: now,
          },
        ]);
      }
      touchList(client, variables);
      return { ...snapshot, knownDuplicate: existing !== undefined };
    },
    // Rejoué hors ligne : le serveur a pu trouver un doublon que l'appareil ignorait.
    onSuccess: (result: { merged: boolean }, { name }: CreateArticleVariables, context) => {
      if (result.merged && !(context as CreateContext | undefined)?.knownDuplicate)
        toast(i18n.t("search:alreadyInList", { name: name.trim() }));
    },
    onError: (error, { userId }: CreateArticleVariables, context) =>
      restoreSnapshot(client, userId, context, error),
    onSettled: (_data, _error, { userId }: CreateArticleVariables) => invalidate(client, userId),
  });

  // COU-10, ART-02, COL-04 : fixe le statut ; le catalogue vide la quantité.
  client.setMutationDefaults(articleMutationKeys.setStatus, {
    scope: SYNC_SCOPE,
    mutationFn: ({ articleId, status }: SetStatusVariables) =>
      call(supabase.rpc("set_status", { p_article_id: articleId, p_status: status })),
    onMutate: async (variables: SetStatusVariables) => {
      const { userId, articleId, status } = variables;
      const snapshot = await takeSnapshot(client, userId);
      const current = snapshot.articles?.find((a) => a.id === articleId);
      // Idempotente : un statut déjà en place ne change rien, pas même status_by (COL-04).
      if (current?.status !== status) {
        patchArticle(client, userId, articleId, (a) => ({
          status,
          statusBy: userId,
          quantity: status === "catalogue" ? null : a.quantity,
        }));
      }
      touchList(client, variables);
      return snapshot;
    },
    onError: (error, { userId }: SetStatusVariables, context) =>
      restoreSnapshot(client, userId, context, error),
    onSettled: (_data, _error, { userId }: SetStatusVariables) => invalidate(client, userId),
  });

  // ART-06, ART-07 (vue « Défaut » : le rayon de l'article).
  client.setMutationDefaults(articleMutationKeys.update, {
    scope: SYNC_SCOPE,
    mutationFn: ({ articleId, name, rayonId, quantity }: UpdateArticleVariables) =>
      call(
        supabase
          .from("articles")
          .update({ name: name.trim(), rayon_id: rayonId, quantity })
          .eq("id", articleId),
      ),
    onMutate: async (variables: UpdateArticleVariables) => {
      const { userId, articleId, name, rayonId, quantity } = variables;
      const snapshot = await takeSnapshot(client, userId);
      patchArticle(client, userId, articleId, () => ({
        name: name.trim(),
        normalizedName: normalizeName(name),
        rayonId,
        quantity,
      }));
      touchList(client, variables);
      return snapshot;
    },
    onError: (error, { userId }: UpdateArticleVariables, context) =>
      restoreSnapshot(client, userId, context, error),
    onSettled: (_data, _error, { userId }: UpdateArticleVariables) => invalidate(client, userId),
  });

  // ART-08 : suppression douce ; la date est fixée par le serveur.
  client.setMutationDefaults(articleMutationKeys.delete, {
    scope: SYNC_SCOPE,
    mutationFn: ({ article }: DeleteArticleVariables) =>
      call(
        supabase
          .from("articles")
          .update({ deleted_at: new Date().toISOString() })
          .eq("id", article.id),
      ),
    onMutate: async (variables: DeleteArticleVariables) => {
      const { userId, article } = variables;
      const snapshot = await takeSnapshot(client, userId);
      setArticles(client, userId, (articles) => articles.filter((a) => a.id !== article.id));
      touchList(client, variables);
      return snapshot;
    },
    onError: (error, { userId }: DeleteArticleVariables, context) =>
      restoreSnapshot(client, userId, context, error),
    onSettled: (_data, _error, { userId }: DeleteArticleVariables) => invalidate(client, userId),
  });

  // ART-08 : « Annuler ». Refusé si un article de même nom a été créé entre-temps.
  client.setMutationDefaults(articleMutationKeys.restore, {
    scope: SYNC_SCOPE,
    mutationFn: ({ article }: DeleteArticleVariables) =>
      call(supabase.from("articles").update({ deleted_at: null }).eq("id", article.id)),
    onMutate: async (variables: DeleteArticleVariables) => {
      const { userId, article } = variables;
      const snapshot = await takeSnapshot(client, userId);
      setArticles(client, userId, (articles) =>
        articles.some((a) => a.id === article.id) ? articles : [...articles, article],
      );
      touchList(client, variables);
      return snapshot;
    },
    onError: (error, { userId }: DeleteArticleVariables, context) =>
      restoreSnapshot(client, userId, context, error),
    onSettled: (_data, _error, { userId }: DeleteArticleVariables) => invalidate(client, userId),
  });
}

export const useCreateArticle = () =>
  useMutation<{ articleId: string; merged: boolean }, Error, CreateArticleVariables>({
    mutationKey: articleMutationKeys.create,
  });
export const useSetArticleStatus = () =>
  useMutation<void, Error, SetStatusVariables>({ mutationKey: articleMutationKeys.setStatus });
export const useUpdateArticle = () =>
  useMutation<void, Error, UpdateArticleVariables>({ mutationKey: articleMutationKeys.update });
export const useDeleteArticle = () =>
  useMutation<void, Error, DeleteArticleVariables>({ mutationKey: articleMutationKeys.delete });
export const useRestoreArticle = () =>
  useMutation<void, Error, DeleteArticleVariables>({ mutationKey: articleMutationKeys.restore });
