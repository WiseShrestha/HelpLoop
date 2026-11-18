import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type HelpRecord =
  | { status: "missing" }
  | { status: "private"; own: false }
  | {
    status: "visible"; own: boolean; public: boolean; name: string; year: number; department: string;
    totals: { sessions: number; people: number; minutes: number; rating: number | null };
    courses: { code: string; en: string; ko: string; sessions: number; people: number; minutes: number; rating: number | null }[];
    first: string | null; last: string | null;
  };

/**
 * F7: a student's verified help record. Visible to everyone (signed out too) only while the
 * student's public_record flag is on; always to the student and admins. Read fresh on every request.
 */
export async function loadHelpRecord(id: string): Promise<HelpRecord> {
  const { data: { user } } = await (await createClient()).auth.getUser();
  const admin = createAdminClient();
  const [profile, viewer] = await Promise.all([
    admin.from("profiles").select("display_name,entry_year,department,public_record").eq("id", id).maybeSingle(),
    user ? admin.from("profiles").select("is_admin").eq("id", user.id).maybeSingle() : { data: null, error: null },
  ]);
  if (profile.error || viewer.error) throw new Error("Unable to load the help record");
  if (!profile.data) return { status: "missing" };
  const own = user?.id === id;
  if (!profile.data.public_record && !own && viewer.data?.is_admin !== true) return { status: "private", own: false };

  const [stats, rows, courses] = await Promise.all([
    admin.from("helper_stats").select("sessions_helped,people_helped,minutes_helped,avg_rating").eq("user_id", id).maybeSingle(),
    admin.from("helper_course_stats").select("course_code,sessions,people_helped,minutes,avg_rating,first_at,last_at").eq("user_id", id),
    admin.from("courses").select("code,name_en,name_ko"),
  ]);
  if (stats.error || rows.error || courses.error) throw new Error("Unable to load the help record");
  const times = rows.data.flatMap((r) => [r.first_at, r.last_at]).filter((x): x is string => !!x).sort();
  return {
    status: "visible", own, public: profile.data.public_record, name: profile.data.display_name,
    year: profile.data.entry_year, department: profile.data.department,
    totals: { sessions: stats.data?.sessions_helped ?? 0, people: stats.data?.people_helped ?? 0,
      minutes: stats.data?.minutes_helped ?? 0, rating: stats.data?.avg_rating ?? null },
    courses: rows.data.filter((r) => r.course_code).map((r) => {
      const c = courses.data.find((x) => x.code === r.course_code);
      return { code: r.course_code!, en: c?.name_en ?? r.course_code!, ko: c?.name_ko ?? r.course_code!,
        sessions: r.sessions ?? 0, people: r.people_helped ?? 0, minutes: r.minutes ?? 0, rating: r.avg_rating };
    }).sort((a, b) => b.sessions - a.sessions),
    first: times[0] ?? null, last: times.at(-1) ?? null,
  };
}
