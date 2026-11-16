"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/db/types";
import { getSupabaseEnv } from "./env";

export function createClient() {
  const env = getSupabaseEnv();
  if (!env) throw new Error("Supabase public environment variables are missing.");
  return createBrowserClient<Database>(env.url, env.key);
}
