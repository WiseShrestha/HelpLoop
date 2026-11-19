import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/db/types";
import { DrawError, type DrawStore } from "./drawCore";
import { readAll } from "./readAll";

function check(error: { message: string } | null, action: string) {
  if (error) throw new Error(`Draw store ${action} failed: ${error.message}`);
}

/** `db` must be the service-role client: draws have no client write policy. */
export function supabaseDrawStore(db: SupabaseClient<Database>): DrawStore {
  return {
    async isAdmin(userId) {
      const { data, error } = await db.from("profiles").select("is_admin").eq("id", userId).maybeSingle();
      check(error, "read");
      return data?.is_admin === true;
    },
    async draw(weekStart) {
      const { data, error } = await db.from("draws").select("id,week_start,commit_hash,prizes,seed,winners,drawn_at")
        .eq("week_start", weekStart).maybeSingle();
      check(error, "read");
      return data;
    },
    async insertDraw(row) {
      const { error } = await db.from("draws").insert(row);
      if (error?.code === "23505") throw new DrawError("This week already has a draw");
      check(error, "write");
    },
    async pool(weekStart) {
      const rows = await readAll((from, to) => db.from("week_tickets").select("user_id,display_name,tickets")
        .eq("week_start", weekStart).order("user_id").range(from, to));
      return rows.flatMap((r) => (r.user_id ? [{ user_id: r.user_id, display_name: r.display_name ?? "", tickets: Number(r.tickets ?? 0) }] : []));
    },
    async saveResult(id, seed, winners) {
      const { data, error } = await db.from("draws").update({ seed, winners, drawn_at: new Date().toISOString() })
        .eq("id", id).is("drawn_at", null).select("id");
      check(error, "write");
      return (data?.length ?? 0) > 0;
    },
  };
}
