import { isAuthRetryableFetchError } from "@supabase/supabase-js";
import { z } from "zod";
import { AUTH_STORAGE_KEY, supabase } from "@/lib/supabase";

const storedSessionSchema = z.object({
  user: z.object({ id: z.uuid(), email: z.string().optional() }),
});

export type AuthState = { userId: string; email: string | null };

// OFF-08 : hors ligne, un jeton expiré ne peut pas être renouvelé, mais la session
// reste stockée. On garde l'usage local au lieu de renvoyer vers la connexion.
function readStoredUserId(): AuthState | null {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    const parsed = storedSessionSchema.safeParse(JSON.parse(raw));
    return parsed.success
      ? { userId: parsed.data.user.id, email: parsed.data.user.email ?? null }
      : null;
  } catch {
    return null;
  }
}

export async function getAuthState(): Promise<AuthState | null> {
  const { data, error } = await supabase.auth.getSession();
  if (data.session) return { userId: data.session.user.id, email: data.session.user.email ?? null };
  if (error && isAuthRetryableFetchError(error)) return readStoredUserId();
  return null;
}
