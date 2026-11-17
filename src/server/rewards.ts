"use server";

import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { supabaseRewardsStore } from "./rewardsStore";
import { awardSession, recomputeWeek, RewardsError } from "./ticketAwards";

// Every export here is a public endpoint: anyone can POST to it. Authorize inside each one.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function callerId(): Promise<string> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new RewardsError("Sign in first");
  return user.id;
}

/** Call right after confirm_session returns 'completed'. Safe to call again. */
export async function completeSessionRewards(sessionId: string): Promise<{ tickets: number }> {
  if (typeof sessionId !== "string" || !UUID.test(sessionId)) throw new RewardsError("You are not in this session");
  const caller = await callerId();
  return awardSession(supabaseRewardsStore(createAdminClient()), caller, sessionId);
}

/** Admins only. Rebuilds the KST week containing `weekStart`; returns the number of sessions awarded. */
export async function recomputeWeekTickets(weekStart: Date): Promise<number> {
  const caller = await callerId();
  return recomputeWeek(supabaseRewardsStore(createAdminClient()), caller, weekStart);
}
