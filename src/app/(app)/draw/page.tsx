import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { DrawScreen, type DrawView } from "./screen";

export const metadata = { title: "HelpLoop | 주간 추첨 · Weekly draw" };

type Winner = { user_id: string; display_name: string; prize: string };
const labels = (prizes: unknown) =>
  Array.isArray(prizes) ? prizes.flatMap((p) => (p && typeof p.label === "string" ? [p.label as string] : [])) : [];

export default async function DrawPage() {
  if (!getSupabaseEnv()) return <DrawScreen draws={[]} unavailable />;
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect("/");
  const draws = await db.from("draws").select("week_start,commit_hash,prizes,seed,winners,drawn_at")
    .order("week_start", { ascending: false }).limit(8);
  if (draws.error) return <DrawScreen draws={[]} unavailable />;
  // The ticket table is published only after the reveal, when it is final (the draw runs after the week ends).
  const drawnWeeks = draws.data.filter((d) => d.drawn_at).map((d) => d.week_start);
  const pool = drawnWeeks.length
    ? await db.from("week_tickets").select("week_start,display_name,tickets").in("week_start", drawnWeeks).order("tickets", { ascending: false })
    : { data: [], error: null };
  if (pool.error) return <DrawScreen draws={[]} unavailable />;
  const view: DrawView[] = draws.data.map((d) => ({
    week: d.week_start, hash: d.commit_hash, prizes: labels(d.prizes), seed: d.drawn_at ? d.seed : null,
    winners: d.drawn_at && Array.isArray(d.winners) ? (d.winners as Winner[]).map((w) => ({ name: w.display_name, prize: w.prize })) : [],
    tickets: pool.data.filter((p) => p.week_start === d.week_start).map((p) => ({ name: p.display_name ?? "—", tickets: Number(p.tickets ?? 0) })),
  }));
  return <DrawScreen draws={view} />;
}
