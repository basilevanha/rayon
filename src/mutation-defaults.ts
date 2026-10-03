import type { QueryClient } from "@tanstack/react-query";
import { registerProfileMutations } from "@/features/auth/profile";

// Chaque feature y branche ses `setMutationDefaults` (OFF-02), avant la restauration du cache.
export function registerMutationDefaults(client: QueryClient): void {
  registerProfileMutations(client);
}
