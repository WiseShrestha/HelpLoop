import "server-only";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { weekStartKST } from "@/lib/model/tickets";
import { readAll } from "./readAll";
import { kstDate } from "./ticketAwards";

export { getHelpFeed } from "./helpFeed";
export { getSuggestedHelpers } from "./suggestedHelpers";

const breakdown = z.object({ sessionId: z.string(), helperId: z.string(), base: z.number(),
  newPair: z.boolean(), pairFactor: z.number(), ratingFactor: z.number(), tickets: z.number() });
const prizes = z.array(z.object({ label: z.string() }));

export async function getWallet() {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) throw new Error("Sign in to see your wallet");
  const week = kstDate(weekStartKST(new Date()));
  const [balance, ledger, total, awards, draw, loops] = await Promise.all([
    db.rpc("my_balance"),
    readAll((from, to) => db.from("ledger").select("delta,reason,created_at,session_id").eq("user_id", user.id)
      .order("created_at", { ascending: false }).order("id", { ascending: false }).range(from, to)),
    db.from("week_tickets").select("tickets").eq("user_id", user.id).eq("week_start", week).maybeSingle(),
    readAll((from, to) => db.from("ticket_awards").select("breakdown").eq("helper_id", user.id).eq("week_start", week).order("created_at").order("session_id").range(from, to)),
    db.from("draws").select("week_start,commit_hash,prizes").eq("week_start", week).maybeSingle(),
    db.from("loop_bonuses").select("loop_key,members,tickets").eq("user_id", user.id).eq("week_start", week).order("created_at"),
  ]);
  if (balance.error || total.error || draw.error || loops.error) throw new Error("Unable to load wallet");
  const others = [...new Set(loops.data.flatMap((l) => l.members))].filter((m) => m !== user.id);
  const names = others.length ? await db.from("profiles").select("id,display_name").in("id", others) : { data: [], error: null };
  if (names.error) throw new Error("Unable to load wallet");
  return { balance: balance.data, weekTickets: total.data?.tickets ?? 0,
    entries: ledger.map(row => ({ delta: row.delta, reason: row.reason, createdAt: row.created_at, sessionId: row.session_id ?? undefined })),
    breakdown: awards.flatMap(row => {
      const decoded = breakdown.safeParse(row.breakdown);
      return decoded.success ? [decoded.data] : []; // Legacy awards can lack factor details.
    }),
    loops: loops.data.map((l) => ({ key: l.loop_key, tickets: Number(l.tickets),
      members: l.members.filter((m) => m !== user.id).map((m) => names.data.find((p) => p.id === m)?.display_name ?? "—") })),
    draw: draw.data ? { weekStart: draw.data.week_start, commitHash: draw.data.commit_hash, prizes: prizes.parse(draw.data.prizes) } : null };
}
