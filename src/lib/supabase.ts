import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { parseEnv } from "@/lib/env";

const env = parseEnv(import.meta.env);

export const supabase = createClient<Database>(
  env.VITE_SUPABASE_URL,
  env.VITE_SUPABASE_PUBLISHABLE_KEY,
  { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } },
);
