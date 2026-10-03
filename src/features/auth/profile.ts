import { queryOptions, useIsMutating, useMutation, type QueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { supabase } from "@/lib/supabase";

const profileSchema = z.object({
  id: z.uuid(),
  display_name: z.string().nullable(),
  role: z.enum(["utilisateur", "editeur", "administrateur"]),
});

export type Profile = z.infer<typeof profileSchema>;

export const profileQueryOptions = (userId: string) =>
  queryOptions({
    queryKey: ["profile", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name, role")
        .eq("id", userId)
        .single();
      if (error) throw error;
      return profileSchema.parse(data);
    },
  });

type SetDisplayNameVariables = { userId: string; displayName: string };

const setDisplayNameKey = ["profile", "set-display-name"] as const;

// CPT-04. Enregistré avant la restauration du cache pour être rejouable (OFF-02).
export function registerProfileMutations(client: QueryClient): void {
  client.setMutationDefaults(setDisplayNameKey, {
    mutationFn: async ({ userId, displayName }: SetDisplayNameVariables) => {
      const { error } = await supabase
        .from("profiles")
        .update({ display_name: displayName })
        .eq("id", userId);
      if (error) throw error;
    },
    onMutate: async ({ userId, displayName }: SetDisplayNameVariables) => {
      const { queryKey } = profileQueryOptions(userId);
      await client.cancelQueries({ queryKey });
      const previous = client.getQueryData(queryKey);
      client.setQueryData(queryKey, (old) => (old ? { ...old, display_name: displayName } : old));
      return { previous };
    },
    onError: (_error, { userId }: SetDisplayNameVariables, context) => {
      const previous = (context as { previous?: Profile } | undefined)?.previous;
      if (previous) client.setQueryData(profileQueryOptions(userId).queryKey, previous);
    },
    onSettled: (_data, _error, { userId }: SetDisplayNameVariables) =>
      client.invalidateQueries({ queryKey: profileQueryOptions(userId).queryKey }),
  });
}

// Vrai tant qu'un nom affiché attend d'être enregistré, y compris hors ligne.
export function useIsSettingDisplayName(): boolean {
  return useIsMutating({ mutationKey: setDisplayNameKey }) > 0;
}

export function useSetDisplayName() {
  return useMutation<void, Error, SetDisplayNameVariables>({ mutationKey: setDisplayNameKey });
}
