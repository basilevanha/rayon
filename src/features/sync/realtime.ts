import { useEffect } from "react";
import { useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { toast } from "sonner";
import { z } from "zod";
import { articleKeys } from "@/features/articles/queries";
import { remoteArticleSchema, type Article } from "@/features/articles/schemas";
import { listKeys, listsQueryOptions, sortLists } from "@/features/lists/queries";
import { listSummarySchema, type ListDetail, type ListSummary } from "@/features/lists/schemas";
import { mergeRemoteArticle } from "@/lib/conflicts";
import { i18n } from "@/lib/i18n";
import { supabase } from "@/lib/supabase";

const memberEventSchema = z.object({ list_id: z.uuid(), user_id: z.uuid() });
const memberNameSchema = z.object({ display_name: z.string().nullable() }).nullable();
const pendingVariablesSchema = z.object({
  articleId: z.string().optional(),
  article: z.object({ id: z.string() }).optional(),
});

// Une modification locale de cet article attend le serveur : elle relira l'article
// à sa fin (onSettled). Un événement reçu entre-temps ne doit pas l'écraser à l'écran.
function hasPendingChange(client: QueryClient, articleId: string): boolean {
  return client
    .getMutationCache()
    .getAll()
    .some((mutation) => {
      if (mutation.state.status !== "pending") return false;
      const variables = pendingVariablesSchema.safeParse(mutation.state.variables);
      return (
        variables.success &&
        (variables.data.articleId === articleId || variables.data.article?.id === articleId)
      );
    });
}

function applyArticle(client: QueryClient, userId: string, payload: unknown) {
  const parsed = remoteArticleSchema.safeParse(payload);
  if (!parsed.success || hasPendingChange(client, parsed.data.id)) return;
  const { deletedAt, ...article } = parsed.data;
  client.setQueryData(articleKeys.all(userId), (old: Article[] | undefined) => {
    if (!old) return old;
    const next = mergeRemoteArticle<Article>(old, { ...article, deletedAt });
    return next === old ? old : [...next];
  });
}

// NAV-06 : nom, emoji et activité.
function applyList(client: QueryClient, userId: string, payload: unknown) {
  const parsed = listSummarySchema.safeParse(payload);
  if (!parsed.success) return;
  const list = parsed.data;
  client.setQueryData(
    listKeys.all(userId),
    (old: ListSummary[] | undefined) =>
      old && sortLists(old.map((l) => (l.id === list.id ? list : l))),
  );
  client.setQueryData(listKeys.detail(list.id), (old: ListDetail | null | undefined) =>
    old ? { ...old, ...list } : old,
  );
}

// INV-04 : « [membre] a rejoint « [liste] » ».
async function announceMember(client: QueryClient, userId: string, payload: unknown) {
  const parsed = memberEventSchema.safeParse(payload);
  if (!parsed.success || parsed.data.user_id === userId) return;
  const { list_id: listId, user_id: memberId } = parsed.data;
  void client.invalidateQueries({ queryKey: listKeys.detail(listId) });
  const { data } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", memberId)
    .maybeSingle();
  const list = client
    .getQueryData<ListSummary[]>(listKeys.all(userId))
    ?.find((l) => l.id === listId);
  if (!list) return;
  toast(
    i18n.t("sync:memberJoined", {
      name: memberNameSchema.safeParse(data).data?.display_name ?? i18n.t("sync:unnamedMember"),
      list: list.name,
    }),
  );
}

function memberLeft(client: QueryClient, userId: string, payload: unknown) {
  const parsed = memberEventSchema.safeParse(payload);
  if (!parsed.success) return;
  const { list_id: listId, user_id: memberId } = parsed.data;
  void client.invalidateQueries({ queryKey: listKeys.detail(listId) });
  if (memberId !== userId) return;
  // Retiré, parti depuis un autre appareil, ou liste supprimée.
  client.setQueryData(articleKeys.all(userId), (old: Article[] | undefined) =>
    old?.filter((a) => a.listId !== listId),
  );
  void client.invalidateQueries({ queryKey: listKeys.all(userId) });
}

function catchUp(client: QueryClient, userId: string) {
  void client.invalidateQueries({ queryKey: articleKeys.all(userId) });
  void client.invalidateQueries({ queryKey: listKeys.all(userId) });
}

/**
 * COL-01 : les modifications des autres membres arrivent en temps réel, sur les canaux
 * privés de chaque liste (« list:<id> ») et du compte (« user:<id> »).
 */
export function useRealtimeSync(userId: string) {
  const client = useQueryClient();
  const { data: lists } = useQuery(listsQueryOptions(userId));
  // Les canaux ne changent que si l'ensemble des listes change, pas leur ordre ou leur nom.
  const listKey = (lists ?? [])
    .map((l) => l.id)
    .toSorted()
    .join(",");

  useEffect(() => {
    let stopped = false;
    const channels: RealtimeChannel[] = [];

    function open(topic: string, events: Record<string, (payload: unknown) => void>) {
      const channel = supabase.channel(topic, { config: { private: true } });
      for (const [event, handle] of Object.entries(events)) {
        channel.on("broadcast", { event }, ({ payload }) => handle(payload));
      }
      // Ce qui a changé avant l'abonnement, ou pendant une coupure, est rattrapé en relisant.
      channel.subscribe((status) => {
        if (status === "SUBSCRIBED") catchUp(client, userId);
      });
      channels.push(channel);
    }

    const listIds = listKey ? listKey.split(",") : [];

    void (async () => {
      // Les canaux privés exigent le jeton du compte (politique de realtime.messages).
      await supabase.realtime.setAuth();
      if (stopped) return;
      open(`user:${userId}`, {
        member_joined: () => catchUp(client, userId),
        member_left: (payload) => memberLeft(client, userId, payload),
      });
      for (const listId of listIds) {
        open(`list:${listId}`, {
          article: (payload) => applyArticle(client, userId, payload),
          list: (payload) => applyList(client, userId, payload),
          member_joined: (payload) => void announceMember(client, userId, payload),
          member_left: (payload) => memberLeft(client, userId, payload),
        });
      }
    })();

    return () => {
      stopped = true;
      for (const channel of channels) void supabase.removeChannel(channel);
    };
  }, [client, userId, listKey]);
}
