import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/lib/db/types";
import { getSupabaseEnv } from "./env";

export async function createClient() {
  const env = getSupabaseEnv();
  if (!env) throw new Error("Supabase public environment variables are missing.");
  const cookieStore = await cookies();
  return createServerClient<Database>(env.url, env.key, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll(values) {
        try {
          values.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Server Components cannot write cookies; proxy refreshes them.
        }
      },
    },
  });
}
