import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type { createClient } from "@/lib/supabase/server";
import { partnerGroups, tableCompanions, type PartnerGroup } from "@/lib/profile";
import { readAll } from "./readAll";

type Db = Awaited<ReturnType<typeof createClient>>;

export type PublicProfile = {
  id: string; name: string; year: number; department: string; bio: string | null; publicRecord: boolean;
  courses: { code: string; en: string; ko: string }[];
  stats: { sessions: number; people: number; minutes: number; rating: number | null };
  partners: PartnerGroup[]; tablePeople: number; own: boolean;
  loops: { key: string; members: string[]; week: string }[]; // own profile only
};

/** A student's profile for a signed-in viewer. Partner identities stay on the server; only counts leave. */
export async function loadPublicProfile(db: Db, viewerId: string, id: string): Promise<PublicProfile | null> {
  const [profile, stats, tables, joins] = await Promise.all([
    db.from("profiles").select("id,display_name,entry_year,department,bio,help_courses,public_record").eq("id", id).maybeSingle(),
    db.from("helper_stats").select("sessions_helped,people_helped,minutes_helped,avg_rating").eq("user_id", id).maybeSingle(),
    readAll((f, t) => db.from("open_tables").select("id,host_id").order("id").range(f, t)),
    readAll((f, t) => db.from("open_table_joins").select("table_id,user_id").order("table_id").range(f, t)),
  ]);
  if (profile.error || stats.error) throw new Error("Unable to load profile");
  if (!profile.data) return null;
  const own = viewerId === id;

  // Sessions are private to their two participants, so the server counts partners with the service role.
  const sessions = await readAll((f, t) => createAdminClient().from("sessions").select("helper_id,asker_id")
    .eq("status", "completed").or(`helper_id.eq.${id},asker_id.eq.${id}`).order("id").range(f, t));
  const partnerIds = [...new Set(sessions.flatMap((s) => [s.helper_id, s.asker_id]))].filter((p) => p !== id);
  const [partners, courses, loops] = await Promise.all([
    partnerIds.length ? db.from("profiles").select("id,entry_year,department").in("id", partnerIds) : { data: [], error: null },
    profile.data.help_courses.length ? db.from("courses").select("code,name_en,name_ko").in("code", profile.data.help_courses) : { data: [], error: null },
    own ? db.from("loop_bonuses").select("loop_key,members,week_start").eq("user_id", id).order("created_at", { ascending: false }) : { data: [], error: null },
  ]);
  if (partners.error || courses.error || loops.error) throw new Error("Unable to load profile");
  const loopPeople = [...new Set(loops.data.flatMap((l) => l.members))];
  const names = loopPeople.length ? await db.from("profiles").select("id,display_name").in("id", loopPeople) : { data: [], error: null };
  if (names.error) throw new Error("Unable to load profile");
  const name = (uid: string) => names.data.find((p) => p.id === uid)?.display_name ?? "—";

  return {
    id, name: profile.data.display_name, year: profile.data.entry_year, department: profile.data.department,
    bio: profile.data.bio, publicRecord: profile.data.public_record, own,
    courses: profile.data.help_courses.flatMap((code) => {
      const c = courses.data.find((x) => x.code === code);
      return c ? [{ code, en: c.name_en, ko: c.name_ko }] : [];
    }),
    stats: { sessions: stats.data?.sessions_helped ?? 0, people: stats.data?.people_helped ?? 0,
      minutes: stats.data?.minutes_helped ?? 0, rating: stats.data?.avg_rating ?? null },
    partners: partnerGroups(id, sessions, partners.data),
    tablePeople: tableCompanions(id, tables, joins),
    loops: loops.data.map((l) => ({ key: l.loop_key, week: l.week_start, members: l.members.map(name) })),
  };
}
