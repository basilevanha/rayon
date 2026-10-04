import { useIsMutating, useMutation, type QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { z } from "zod";
import { listErrorMessage } from "@/features/lists/errors";
import {
  invitationSchema,
  type ListDetail,
  type ListInvitation,
  type ListSummary,
} from "@/features/lists/schemas";
import { articleKeys } from "@/features/articles/queries";
import type { Article } from "@/features/articles/schemas";
import { listKeys, sortLists } from "@/features/lists/queries";
import { i18n } from "@/lib/i18n";
import { call, callAs } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import { SYNC_SCOPE } from "@/lib/sync-scope";

export { listKeys };

export const listMutationKeys = {
  create: ["lists", "create"],
  update: ["lists", "update"],
  leave: ["lists", "leave"],
  removeMember: ["lists", "remove-member"],
  delete: ["lists", "delete"],
  createInvitation: ["lists", "create-invitation"],
  revokeInvitation: ["lists", "revoke-invitation"],
  acceptInvitation: ["lists", "accept-invitation"],
  acceptPendingInvitations: ["lists", "accept-pending-invitations"],
} as const;

export type CreateListVariables = {
  userId: string;
  listId: string;
  name: string;
  emoji: string;
  displayName: string | null;
  // LST-04 : liste dont les articles sont copiés, et id de chaque copie, généré par
  // l'appareil pour l'afficher tout de suite, même hors ligne (OFF-02).
  sourceListId?: string;
  copies?: { sourceId: string; id: string }[];
};
export type UpdateListVariables = { userId: string; listId: string; name: string; emoji: string };
export type LeaveListVariables = { userId: string; listId: string };
export type RemoveMemberVariables = { listId: string; memberId: string };
export type DeleteListVariables = { userId: string; listId: string; name: string };
export type RevokeInvitationVariables = { listId: string; invitationId: string };

type Snapshot = {
  lists: ListSummary[] | undefined;
  detail: ListDetail | null | undefined;
};

async function takeSnapshot(
  client: QueryClient,
  userId: string | null,
  listId: string,
): Promise<Snapshot> {
  if (userId) await client.cancelQueries({ queryKey: listKeys.all(userId) });
  await client.cancelQueries({ queryKey: listKeys.detail(listId) });
  return {
    lists: userId ? client.getQueryData(listKeys.all(userId)) : undefined,
    detail: client.getQueryData(listKeys.detail(listId)),
  };
}

// OFF-02 : une action rejouée plus tard peut être refusée alors que l'écran a changé.
// Le refus est toujours signalé, jamais silencieux.
function restoreSnapshot(
  client: QueryClient,
  userId: string | null,
  listId: string,
  context: unknown,
  error: Error,
): void {
  toast.error(i18n.t(listErrorMessage(error).messageKey));
  const snapshot = context as Snapshot | undefined;
  if (!snapshot) return;
  if (userId) client.setQueryData(listKeys.all(userId), snapshot.lists);
  if (snapshot.detail === undefined) client.removeQueries({ queryKey: listKeys.detail(listId) });
  else client.setQueryData(listKeys.detail(listId), snapshot.detail);
}

function invalidate(client: QueryClient, userId: string | null, listId: string) {
  return Promise.all([
    userId ? client.invalidateQueries({ queryKey: listKeys.all(userId) }) : undefined,
    client.invalidateQueries({ queryKey: listKeys.detail(listId) }),
  ]);
}

// OFF-02 : enregistré avant la restauration du cache, pour rejouer les mutations en attente.
export function registerListMutations(client: QueryClient): void {
  // LST-01. L'id vient de l'appareil : la liste existe à l'écran avant le serveur.
  client.setMutationDefaults(listMutationKeys.create, {
    scope: SYNC_SCOPE,
    mutationFn: ({ userId, listId, name, emoji, sourceListId, copies = [] }: CreateListVariables) =>
      callAs(
        userId,
        sourceListId
          ? supabase.rpc("copier_liste", {
              p_source_id: sourceListId,
              p_id: listId,
              p_name: name,
              p_emoji: emoji,
              p_source_article_ids: copies.map((c) => c.sourceId),
              p_article_ids: copies.map((c) => c.id),
            })
          : supabase.rpc("creer_liste", { p_id: listId, p_name: name, p_emoji: emoji }),
      ),
    onMutate: async (variables: CreateListVariables) => {
      const { userId, listId, name, emoji, displayName, copies = [] } = variables;
      const snapshot = await takeSnapshot(client, userId, listId);
      // LST-04 : copies au catalogue, sans quantité.
      if (copies.length > 0) {
        const now = new Date().toISOString();
        client.setQueryData(articleKeys.all(userId), (old: Article[] | undefined) => {
          if (!old) return old;
          const sources = new Map(old.map((a) => [a.id, a]));
          const copied = copies.flatMap(({ sourceId, id }) => {
            const source = sources.get(sourceId);
            return source
              ? [
                  {
                    ...source,
                    id,
                    listId,
                    status: "catalogue" as const,
                    statusBy: null,
                    quantity: null,
                    updatedBy: userId,
                    updatedAt: now,
                  },
                ]
              : [];
          });
          return [...old, ...copied];
        });
      }
      // NAV-06 : une liste créée est la plus récemment active.
      const summary = { id: listId, name, emoji, activity_at: new Date().toISOString() };
      client.setQueryData(listKeys.all(userId), (old: ListSummary[] | undefined) =>
        sortLists([...(old ?? []), summary]),
      );
      client.setQueryData<ListDetail>(listKeys.detail(listId), {
        ...summary,
        members: [{ userId, displayName, isCreator: true, joinedAt: new Date().toISOString() }],
      });
      return snapshot;
    },
    onError: (error, { userId, listId }: CreateListVariables, context) =>
      restoreSnapshot(client, userId, listId, context, error),
    onSettled: (_data, _error, { userId, listId, sourceListId }: CreateListVariables) =>
      Promise.all([
        invalidate(client, userId, listId),
        sourceListId ? client.invalidateQueries({ queryKey: articleKeys.all(userId) }) : undefined,
      ]),
  });

  // LST-05 : nom et emoji.
  client.setMutationDefaults(listMutationKeys.update, {
    scope: SYNC_SCOPE,
    mutationFn: ({ userId, listId, name, emoji }: UpdateListVariables) =>
      callAs(userId, supabase.from("lists").update({ name, emoji }).eq("id", listId)),
    onMutate: async ({ userId, listId, name, emoji }: UpdateListVariables) => {
      const snapshot = await takeSnapshot(client, userId, listId);
      // NAV-06 : renommer la liste la fait remonter.
      const activity_at = new Date().toISOString();
      client.setQueryData(
        listKeys.all(userId),
        (old: ListSummary[] | undefined) =>
          old &&
          sortLists(
            old.map((list) => (list.id === listId ? { ...list, name, emoji, activity_at } : list)),
          ),
      );
      client.setQueryData(listKeys.detail(listId), (old: ListDetail | null | undefined) =>
        old ? { ...old, name, emoji, activity_at } : old,
      );
      return snapshot;
    },
    onError: (error, { userId, listId }: UpdateListVariables, context) =>
      restoreSnapshot(client, userId, listId, context, error),
    onSettled: (_data, _error, { userId, listId }: UpdateListVariables) =>
      invalidate(client, userId, listId),
  });

  // LST-07, LST-08 : le serveur transfère le rôle ou supprime la liste.
  client.setMutationDefaults(listMutationKeys.leave, {
    scope: SYNC_SCOPE,
    mutationFn: ({ userId, listId }: LeaveListVariables) =>
      callAs(userId, supabase.rpc("quitter_liste", { p_list_id: listId })),
    onMutate: async ({ userId, listId }: LeaveListVariables) => {
      const snapshot = await takeSnapshot(client, userId, listId);
      client.setQueryData(listKeys.all(userId), (old: ListSummary[] | undefined) =>
        old?.filter((list) => list.id !== listId),
      );
      return snapshot;
    },
    onError: (error, { userId, listId }: LeaveListVariables, context) =>
      restoreSnapshot(client, userId, listId, context, error),
    onSettled: (_data, _error, { userId, listId }: LeaveListVariables) =>
      invalidate(client, userId, listId),
  });

  // LST-06
  client.setMutationDefaults(listMutationKeys.removeMember, {
    scope: SYNC_SCOPE,
    mutationFn: ({ listId, memberId }: RemoveMemberVariables) =>
      call(supabase.rpc("retirer_membre", { p_list_id: listId, p_user_id: memberId })),
    onMutate: async ({ listId, memberId }: RemoveMemberVariables) => {
      const snapshot = await takeSnapshot(client, null, listId);
      client.setQueryData(listKeys.detail(listId), (old: ListDetail | null | undefined) =>
        old ? { ...old, members: old.members.filter((m) => m.userId !== memberId) } : old,
      );
      return snapshot;
    },
    onError: (error, { listId }: RemoveMemberVariables, context) =>
      restoreSnapshot(client, null, listId, context, error),
    onSettled: (_data, _error, { listId }: RemoveMemberVariables) =>
      invalidate(client, null, listId),
  });

  // LST-06
  client.setMutationDefaults(listMutationKeys.delete, {
    scope: SYNC_SCOPE,
    mutationFn: ({ userId, listId, name }: DeleteListVariables) =>
      callAs(userId, supabase.rpc("supprimer_liste", { p_list_id: listId, p_name: name })),
    onMutate: async ({ userId, listId }: DeleteListVariables) => {
      const snapshot = await takeSnapshot(client, userId, listId);
      client.setQueryData(listKeys.all(userId), (old: ListSummary[] | undefined) =>
        old?.filter((list) => list.id !== listId),
      );
      return snapshot;
    },
    onError: (error, { userId, listId }: DeleteListVariables, context) =>
      restoreSnapshot(client, userId, listId, context, error),
    onSettled: (_data, _error, { userId, listId }: DeleteListVariables) =>
      invalidate(client, userId, listId),
  });

  // OFF-07 : les invitations nécessitent le réseau. networkMode « always » : une
  // invitation n'est jamais mise en file pour être créée plus tard à l'insu du membre.
  // Le code est généré par le serveur : pas de mise à jour optimiste possible.
  client.setMutationDefaults(listMutationKeys.createInvitation, {
    networkMode: "always",
    retry: false,
    mutationFn: async (listId: string) =>
      invitationSchema.parse(
        await call(supabase.rpc("creer_invitation", { p_list_id: listId }).single()),
      ),
    onSuccess: (invitation: ListInvitation, listId: string) =>
      client.setQueryData(listKeys.invitations(listId), (old: ListInvitation[] | undefined) => [
        invitation,
        ...(old ?? []),
      ]),
  });

  client.setMutationDefaults(listMutationKeys.revokeInvitation, {
    networkMode: "always",
    retry: false,
    mutationFn: ({ invitationId }: RevokeInvitationVariables) =>
      call(supabase.rpc("revoquer_invitation", { p_id: invitationId })),
    onMutate: async ({ listId, invitationId }: RevokeInvitationVariables) => {
      const queryKey = listKeys.invitations(listId);
      await client.cancelQueries({ queryKey });
      const previous = client.getQueryData<ListInvitation[]>(queryKey);
      client.setQueryData(
        queryKey,
        previous?.filter((i) => i.id !== invitationId),
      );
      return { previous };
    },
    onError: (_error, { listId }: RevokeInvitationVariables, context) =>
      client.setQueryData(
        listKeys.invitations(listId),
        (context as { previous?: ListInvitation[] } | undefined)?.previous,
      ),
    onSettled: (_data, _error, { listId }: RevokeInvitationVariables) =>
      client.invalidateQueries({ queryKey: listKeys.invitations(listId) }),
  });

  // TEC-03, INV-02 : renvoie l'id de la liste rejointe.
  client.setMutationDefaults(listMutationKeys.acceptInvitation, {
    networkMode: "always",
    retry: false,
    mutationFn: async (code: string) =>
      z.uuid().parse(await call(supabase.rpc("accepter_invitation", { p_code: code }))),
    onSuccess: () =>
      Promise.all([
        client.invalidateQueries({ queryKey: ["lists"] }),
        client.invalidateQueries({ queryKey: ["articles"] }),
      ]),
  });

  // INV-02 : rattrape un compte inscrit avec un code de liste sans être revenu par le lien.
  client.setMutationDefaults(listMutationKeys.acceptPendingInvitations, {
    networkMode: "always",
    retry: false,
    mutationFn: async () =>
      z.array(z.uuid()).parse(await call(supabase.rpc("accepter_invitations_en_attente"))),
    onSuccess: (listIds: string[]) =>
      listIds.length > 0
        ? Promise.all([
            client.invalidateQueries({ queryKey: ["lists"] }),
            client.invalidateQueries({ queryKey: ["articles"] }),
          ])
        : undefined,
  });
}

export const useCreateList = () =>
  useMutation<void, Error, CreateListVariables>({ mutationKey: listMutationKeys.create });
export const useUpdateList = () =>
  useMutation<void, Error, UpdateListVariables>({ mutationKey: listMutationKeys.update });
export const useLeaveList = () =>
  useMutation<void, Error, LeaveListVariables>({ mutationKey: listMutationKeys.leave });
export const useRemoveMember = () =>
  useMutation<void, Error, RemoveMemberVariables>({ mutationKey: listMutationKeys.removeMember });
export const useDeleteList = () =>
  useMutation<void, Error, DeleteListVariables>({ mutationKey: listMutationKeys.delete });
export const useCreateInvitation = () =>
  useMutation<ListInvitation, Error, string>({ mutationKey: listMutationKeys.createInvitation });
export const useRevokeInvitation = () =>
  useMutation<void, Error, RevokeInvitationVariables>({
    mutationKey: listMutationKeys.revokeInvitation,
  });
export const useAcceptPendingInvitations = () =>
  useMutation<string[], Error, void>({ mutationKey: listMutationKeys.acceptPendingInvitations });
export const useAcceptInvitation = () =>
  useMutation<string, Error, string>({ mutationKey: listMutationKeys.acceptInvitation });

// Vrai tant que la création de cette liste attend le serveur, y compris hors ligne :
// une lecture qui ne la trouve pas encore ne signifie pas qu'elle est inaccessible.
export function useIsCreatingList(listId: string): boolean {
  return (
    useIsMutating({
      mutationKey: listMutationKeys.create,
      predicate: (mutation) =>
        (mutation.state.variables as CreateListVariables | undefined)?.listId === listId,
    }) > 0
  );
}
