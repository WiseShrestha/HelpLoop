import "server-only";

import { notFound } from "next/navigation";
import { flagSessions, type Flag } from "@/lib/admin/flags";
import { pilotMetrics, type Metric } from "@/lib/admin/metrics";
import { weekStartKST } from "@/lib/model/tickets";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { prizeLabels } from "./drawCore";
import { readAll } from "./readAll";
import { kstDate } from "./ticketAwards";

const DAY_MS = 86_400_000;

/** The signed-in admin and their own client (admin RLS reads), or a 404 for everyone else. */
export async function requireAdmin() {
  if (!getSupabaseEnv()) notFound();
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) notFound();
  const { data } = await db.from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
  if (data?.is_admin !== true) notFound();
  return { db, userId: user.id };
}

/** "YYYY-MM-DD" (any day) → that KST week's Monday; anything else → this week. */
export function adminWeek(param: string | undefined, now = new Date()): { key: string; start: Date } {
  const parsed = param && /^\d{4}-\d{2}-\d{2}$/.test(param) ? new Date(`${param}T12:00:00+09:00`) : now;
  const start = weekStartKST(Number.isNaN(parsed.getTime()) ? now : parsed);
  return { key: kstDate(start), start };
}

export type AdminSession = {
  id: string; helper: string; asker: string; minutes: number; rating: number | null; status: string;
  completedAt: string | null; covered: string | null; tickets: number | null; flags: Flag[];
};

export async function loadAdminData(db: Awaited<ReturnType<typeof createClient>>, week: { key: string; start: Date }) {
  const end = new Date(week.start.getTime() + 7 * DAY_MS);
  const [draw, pool, profiles, identities, sessions, awards, ledger, requests, reports] = await Promise.all([
    db.from("draws").select("week_start,commit_hash,prizes,seed,winners,drawn_at").eq("week_start", week.key).maybeSingle(),
    readAll((f, t) => db.from("week_tickets").select("user_id,display_name,tickets").eq("week_start", week.key).order("tickets", { ascending: false }).range(f, t)),
    readAll((f, t) => db.from("profiles").select("id,display_name,entry_year,department,created_at").order("id").range(f, t)),
    readAll((f, t) => db.from("private_profiles").select("user_id,real_name,student_no").order("user_id").range(f, t)),
    readAll((f, t) => db.from("sessions").select("id,helper_id,asker_id,status,minutes,rating,scheduled_at,created_at,completed_at,covered").order("id").range(f, t)),
    readAll((f, t) => db.from("ticket_awards").select("session_id,tickets,breakdown").order("session_id").range(f, t)),
    readAll((f, t) => db.from("ledger").select("user_id,delta").order("id").range(f, t)),
    readAll((f, t) => db.from("requests").select("asker_id,status,minutes").order("id").range(f, t)),
    db.from("reports").select("id,session_id,reporter_id,reason,created_at").is("resolved_at", null).order("created_at"),
  ]);
  if (draw.error || reports.error) throw new Error("Unable to load admin data");

  const name = new Map(profiles.map((p) => [p.id, p.display_name]));
  const identity = new Map(identities.map((i) => [i.user_id, i]));
  const tickets = new Map(awards.map((a) => [a.session_id, Number(a.tickets)]));
  const inWeek = sessions.filter((s) => s.completed_at && Date.parse(s.completed_at) >= week.start.getTime()
    && Date.parse(s.completed_at) < end.getTime());
  const flags = flagSessions(inWeek, sessions, profiles);
  const toRow = (s: (typeof sessions)[number]): AdminSession => ({
    id: s.id, helper: name.get(s.helper_id) ?? "—", asker: name.get(s.asker_id) ?? "—", minutes: s.minutes, rating: s.rating,
    status: s.status, completedAt: s.completed_at, covered: s.covered, tickets: tickets.get(s.id) ?? null, flags: flags.get(s.id) ?? [],
  });
  const flagged = inWeek.filter((s) => flags.has(s.id)).map(toRow);

  const winners = Array.isArray(draw.data?.winners) ? (draw.data.winners as { user_id: string; display_name: string; prize: string }[]) : [];
  const verification = winners.map((w) => ({
    ...w,
    realName: identity.get(w.user_id)?.real_name ?? "—",
    studentNo: identity.get(w.user_id)?.student_no ?? "—",
    partners: [...new Set(inWeek.filter((s) => s.status === "completed" && s.helper_id === w.user_id).map((s) => s.asker_id))]
      .map((id) => ({ name: name.get(id) ?? "—", realName: identity.get(id)?.real_name ?? "—" })),
  }));

  const sessionById = new Map(sessions.map((s) => [s.id, s]));
  const metrics: Metric[] = pilotMetrics({ profiles, onboarded: identities.length, sessions, awards, ledger, requests });
  return {
    draw: draw.data && { ...draw.data, prizes: prizeLabels(draw.data.prizes) },
    pool: pool.map((p) => ({ name: p.display_name ?? "—", tickets: Number(p.tickets ?? 0) })),
    weekOver: Date.now() >= end.getTime(),
    weekSessions: inWeek.filter((s) => s.status === "completed").length,
    flagged,
    verification,
    reports: reports.data.map((r) => {
      const s = sessionById.get(r.session_id);
      return { id: r.id, reason: r.reason, createdAt: r.created_at, reporter: name.get(r.reporter_id) ?? "—",
        session: s ? `${name.get(s.helper_id) ?? "—"} → ${name.get(s.asker_id) ?? "—"} · ${s.minutes} min · ${s.status}` : "—" };
    }),
    metrics,
  };
}
