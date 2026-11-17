import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/db/types";
import type { RewardsStore, SessionRow } from "./ticketAwards";

const COLUMNS = "id, helper_id, asker_id, minutes, rating, status, completed_at";
const PAGE = 1000; // PostgREST's default row limit

type Page<T> = PromiseLike<{ data: T[] | null; error: { message: string } | null }>;

async function readAll<T>(page: (from: number, to: number) => Page<T>): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await page(from, from + PAGE - 1);
    if (error) throw new Error(`Ticket store read failed: ${error.message}`);
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE) return rows;
  }
}

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
  };
}
