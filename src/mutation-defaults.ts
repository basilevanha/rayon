import type { QueryClient } from "@tanstack/react-query";
import { registerArticleMutations } from "@/features/articles/mutations";
import { registerProfileMutations } from "@/features/auth/profile";
import { registerListMutations } from "@/features/lists/mutations";

// Chaque feature y branche ses `setMutationDefaults` (OFF-02), avant la restauration du cache.
export function registerMutationDefaults(client: QueryClient): void {
  registerProfileMutations(client);
  registerListMutations(client);
  registerArticleMutations(client);
}
