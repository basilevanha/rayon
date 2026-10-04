import { isAuthRetryableFetchError } from "@supabase/supabase-js";
import { z } from "zod";
import { AUTH_STORAGE_KEY, supabase } from "@/lib/supabase";

const storedSessionSchema = z.object({
  user: z.object({ id: z.uuid(), email: z.string().optional() }),
});

export type AuthState = {
  userId: string;
  email: string | null;
  // OFF-08 : session refusée en ligne (jeton révoqué) : l'usage local continue,
  // la reconnexion est demandée.
  sessionLost?: boolean;
};

// Dernier compte connecté sur l'appareil, oublié à la déconnexion (CPT-07).
const OWNER_KEY = "rayon-owner";
const ownerSchema = z.object({ userId: z.uuid(), email: z.string().nullable() });

function readOwner(): AuthState | null {
  try {
    const parsed = ownerSchema.safeParse(JSON.parse(localStorage.getItem(OWNER_KEY) ?? "null"));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function forgetOwner(): void {
  localStorage.removeItem(OWNER_KEY);
}

// CPT-07 : enregistre le compte connecté sur l'appareil. Vrai si un autre compte l'était :
// ses données et sa file doivent alors être effacées avant tout affichage ou rejeu.
export function claimDevice(state: { userId: string; email: string | null }): boolean {
  const owner = readOwner();
  localStorage.setItem(OWNER_KEY, JSON.stringify(state));
  return owner !== null && owner.userId !== state.userId;
}

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
  // OFF-08 : plus de session sans déconnexion volontaire : jeton révoqué ou refusé.
  const owner = readOwner();
  return owner && { ...owner, sessionLost: true };
}
