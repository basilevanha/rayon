import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";
import {
  invitationSchema,
  listDetailSchema,
  listSummarySchema,
  type ListSummary,
} from "@/features/lists/schemas";
import { supabase } from "@/lib/supabase";

export const listKeys = {
  all: (userId: string) => ["lists", userId] as const,
  detail: (listId: string) => ["list", listId] as const,
  invitations: (listId: string) => ["list", listId, "invitations"] as const,
};

// NAV-06 : la liste la plus récemment active d'abord ; à égalité, par nom (sans tenir
// compte de la casse ni des accents, les nombres dans l'ordre naturel).
export function sortLists(lists: readonly ListSummary[]): ListSummary[] {
  return lists.toSorted(
    (a, b) =>
      Date.parse(b.activity_at) - Date.parse(a.activity_at) ||
      a.name.localeCompare(b.name, "fr", { sensitivity: "base", numeric: true }),
  );
}

// NAV-03, LST-02 : listes du compte (la RLS ne renvoie que celles dont il est membre).
export const listsQueryOptions = (userId: string) =>
  queryOptions({
    queryKey: listKeys.all(userId),
    queryFn: async () => {
      const { data, error } = await supabase.from("lists").select("id, name, emoji, activity_at");
      if (error) throw error;
      return sortLists(z.array(listSummarySchema).parse(data));
    },
  });

// NAV-02 : liste et membres avec leur nom affiché. null si la liste est inaccessible.
export const listQueryOptions = (listId: string) =>
  queryOptions({
    queryKey: listKeys.detail(listId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lists")
        .select(
          "id, name, emoji, activity_at, list_members(user_id, joined_at, is_creator, profiles(display_name))",
        )
        .eq("id", listId)
        .maybeSingle();
      if (error) throw error;
      return data === null ? null : listDetailSchema.parse(data);
    },
  });

// INV-01 : invitations encore révocables, y compris celles réservées par une inscription.
export const invitationsQueryOptions = (listId: string) =>
  queryOptions({
    queryKey: listKeys.invitations(listId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invitations")
        .select("id, code, expires_at")
        .eq("list_id", listId)
        .is("accepted_at", null)
        .is("revoked_at", null)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false });
      if (error) throw error;
      return z.array(invitationSchema).parse(data);
    },
  });
