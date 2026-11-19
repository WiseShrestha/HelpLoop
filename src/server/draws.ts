import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { createDrawCore, DrawError, runDrawCore, type Winner } from "./drawCore";
import { supabaseDrawStore } from "./drawStore";
import { supabaseRewardsStore } from "./rewardsStore";

// Admin only (SPEC §8). Both functions check the signed-in caller themselves.

async function callerId(): Promise<string> {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) throw new DrawError("Sign in first");
  return user.id;
}

export async function createDraw(weekStart: Date, commitHash: string, prizes: { label: string }[]): Promise<void> {
  const caller = await callerId();
  await createDrawCore(supabaseDrawStore(createAdminClient()), caller, weekStart, commitHash, prizes);
}

export async function runDraw(weekStart: Date, seed: string): Promise<Winner[]> {
  const caller = await callerId();
  const admin = createAdminClient();
  return runDrawCore(supabaseDrawStore(admin), supabaseRewardsStore(admin), caller, weekStart, seed);
}
