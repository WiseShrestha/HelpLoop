import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type { createClient } from "@/lib/supabase/server";
import type { HelpedCourse } from "@/lib/majors";
import { readAll } from "./readAll";

type Db = Awaited<ReturnType<typeof createClient>>;

/** Rows for Major Explorer. Sessions are private to their participants, so the server reads only
 *  (helper, course) pairs with the service role; no asker or session ids leave this function. */
export async function loadMajorRows(db: Db) {
  const [profiles, stats, perks, courses, helped] = await Promise.all([
    readAll((f, t) => db.from("profiles").select("id,display_name,entry_year,department,help_courses").order("id").range(f, t)),
    readAll((f, t) => db.from("helper_stats").select("user_id,people_helped,sessions_helped,avg_rating").order("user_id").range(f, t)),
    db.from("perks").select("id,title,host_label,description,cost_minutes,department").eq("active", true).order("cost_minutes"),
    db.from("courses").select("code,name_en,name_ko").eq("active", true),
    readAll((f, t) => createAdminClient().from("sessions").select("helper_id,requests(course_code)").eq("status", "completed").order("id").range(f, t)),
  ]);
  if (perks.error || courses.error) throw new Error("Unable to load majors");
  return {
    profiles,
    stats: stats.flatMap((s) => s.user_id ? [{ user_id: s.user_id, people_helped: s.people_helped ?? 0, sessions_helped: s.sessions_helped ?? 0, avg_rating: s.avg_rating }] : []),
    perks: perks.data,
    courses: courses.data,
    helped: helped.flatMap((h): HelpedCourse[] => h.requests?.course_code ? [{ helper_id: h.helper_id, course_code: h.requests.course_code }] : []),
  };
}
