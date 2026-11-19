import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { LeaderboardScreen } from "./screen";

export const metadata = { title: "HelpLoop | 리더보드 · Leaderboard" };

export default async function LeaderboardPage() {
  if (!getSupabaseEnv()) return <LeaderboardScreen rows={[]} unavailable />;
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect("/");
  // Ranked by distinct people helped, not hours; ties by rating (SPEC §6, B7).
  const { data, error } = await db.from("helper_stats")
    .select("user_id,display_name,entry_year,department,people_helped,sessions_helped,avg_rating")
    .gt("people_helped", 0).order("people_helped", { ascending: false })
    .order("avg_rating", { ascending: false, nullsFirst: false }).order("sessions_helped", { ascending: false }).limit(50);
  if (error) return <LeaderboardScreen rows={[]} unavailable />;
  return <LeaderboardScreen me={user.id} rows={data.flatMap((r) => r.user_id ? [{ id: r.user_id, name: r.display_name ?? "—",
    year: r.entry_year ?? 0, department: r.department ?? "", people: r.people_helped ?? 0, sessions: r.sessions_helped ?? 0, rating: r.avg_rating }] : [])} />;
}
