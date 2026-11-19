import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/db/types";
import type { RewardsStore, SessionRow } from "./ticketAwards";

import { readAll } from "./readAll";

const COLUMNS = "id, helper_id, asker_id, minutes, rating, status, completed_at";

function check(error: { message: string } | null, action: string) {
  if (error) throw new Error(`Ticket store ${action} failed: ${error.message}`);
}

/** Either direction between two people. Ids come from the database, never from the caller. */
export function pairFilter(a: string, b: string): string {
  return `and(helper_id.eq.${a},asker_id.eq.${b}),and(helper_id.eq.${b},asker_id.eq.${a})`;
}

/** `db` must be the service-role client from src/lib/supabase/admin.ts. */
export function supabaseRewardsStore(db: SupabaseClient<Database>): RewardsStore {
  const completed = () => db.from("sessions").select(COLUMNS).eq("status", "completed");
  return {
    async session(id) {
      const { data, error } = await db.from("sessions").select(COLUMNS).eq("id", id).maybeSingle();
      check(error, "read");
      return data as SessionRow | null;
    },
    completedBetween: (a, b) => readAll((from, to) => completed().or(pairFilter(a, b)).order("id").range(from, to)),
    completedBefore: (end) =>
      readAll((from, to) => completed().lt("completed_at", end.toISOString()).order("id").range(from, to)),
    async isAdmin(userId) {
      const { data, error } = await db.from("profiles").select("is_admin").eq("id", userId).maybeSingle();
      check(error, "read");
      return data?.is_admin === true;
    },
    async upsertAwards(rows) {
      if (!rows.length) return;
      const { error } = await db.from("ticket_awards").upsert(rows, { onConflict: "session_id" });
      check(error, "write");
    },
    async weekAwardIds(weekStart) {
      const rows = await readAll((from, to) =>
        db.from("ticket_awards").select("session_id").eq("week_start", weekStart).order("session_id").range(from, to));
      return rows.map((r) => r.session_id);
    },
    async deleteAwards(sessionIds) {
      const { error } = await db.from("ticket_awards").delete().in("session_id", sessionIds);
      check(error, "delete");
    },
    completedWithin: (start, end) => readAll((from, to) => completed().gte("completed_at", start.toISOString())
      .lte("completed_at", end.toISOString()).order("id").range(from, to)),
    async rewardedLoopKeys(keys) {
      const { data, error } = await db.from("loop_bonuses").select("loop_key").in("loop_key", keys);
      check(error, "read");
      return [...new Set((data ?? []).map((r) => r.loop_key))];
    },
    async loopBonusCounts(weekStart, userIds) {
      const { data, error } = await db.from("loop_bonuses").select("user_id").eq("week_start", weekStart).in("user_id", userIds);
      check(error, "read");
      const counts = new Map<string, number>();
      for (const r of data ?? []) counts.set(r.user_id, (counts.get(r.user_id) ?? 0) + 1);
      return counts;
    },
    async insertLoopBonuses(rows) {
      const { error } = await db.from("loop_bonuses").upsert(rows, { onConflict: "loop_key,user_id", ignoreDuplicates: true });
      check(error, "write");
    },
    weekLoopBonuses: (weekStart) => readAll((from, to) => db.from("loop_bonuses").select("loop_key,session_ids")
      .eq("week_start", weekStart).order("loop_key").order("user_id").range(from, to)),
    async deleteLoops(keys) {
      const { error } = await db.from("loop_bonuses").delete().in("loop_key", keys);
      check(error, "delete");
    },
  };
}
