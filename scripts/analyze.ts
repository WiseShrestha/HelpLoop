// Prints every SPEC §9 number from the live database as Markdown for the deck.
// Read-only: it only runs SELECTs. Same numbers as the /admin metric tiles.
//
//   pnpm analyze            (reads NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from .env.local)
//   pnpm analyze --csv      (CSV of the headline metrics instead)
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { metricsCsv } from "../src/lib/admin/metrics.ts";
import { markdownReport } from "../src/lib/admin/report.ts";

const PAGE = 1000;

async function all<T>(db: SupabaseClient, table: string, columns: string, orderBy: string): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await db.from(table).select(columns).order(orderBy).range(from, from + PAGE - 1);
    if (error) throw new Error(`${table}: ${error.message}`);
    rows.push(...((data ?? []) as T[]));
    if (!data || data.length < PAGE) return rows;
  }
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (for example in .env.local).");
    process.exit(1);
  }
  const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const [profiles, identities, sessions, awards, ledger, requests] = await Promise.all([
    all<{ id: string; entry_year: number; department: string }>(db, "profiles", "id,entry_year,department", "id"),
    all<{ user_id: string }>(db, "private_profiles", "user_id", "user_id"),
    all<{ helper_id: string; asker_id: string; status: string; rating: number | null; completed_at: string | null }>(
      db, "sessions", "helper_id,asker_id,status,rating,completed_at", "id"),
    all<{ tickets: number; breakdown: unknown }>(db, "ticket_awards", "tickets,breakdown", "session_id"),
    all<{ user_id: string; delta: number }>(db, "ledger", "user_id,delta", "id"),
    all<{ asker_id: string; status: string; minutes: number }>(db, "requests", "asker_id,status,minutes", "id"),
  ]);
  const { markdown, metrics } = markdownReport(
    { profiles, onboarded: identities.length, sessions, awards, ledger, requests }, new Date());
  console.log(process.argv.includes("--csv") ? metricsCsv(metrics) : markdown);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
