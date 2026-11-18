import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { suggestHelpers } from "@/lib/model/priority";
import { weekStartKST } from "@/lib/model/tickets";

export async function getSuggestedHelpers(requestId: string) {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return [];
  const request = await db.from("requests").select("course_code").eq("id", requestId)
    .eq("asker_id", user.id).eq("status", "open").maybeSingle();
  if (request.error) throw request.error;
  if (!request.data) return [];
  const courseCode = request.data.course_code;
  const candidates = await db.from("profiles").select("id, display_name, help_courses")
    .eq("consent", true).neq("id", user.id).contains("help_courses", [courseCode]);
  if (candidates.error) throw candidates.error;
  if (!candidates.data.length) return [];
  const ids = candidates.data.map(row => row.id);
  const [ratings, history, workload] = await Promise.all([
    db.from("helper_stats").select("user_id, avg_rating").in("user_id", ids),
    db.from("sessions").select("asker_id, helper_id").eq("status", "completed").or(`asker_id.eq.${user.id},helper_id.eq.${user.id}`),
    createAdminClient().from("sessions").select("helper_id").in("helper_id", ids)
      .eq("status", "completed").gte("completed_at", weekStartKST(new Date()).toISOString()),
  ]);
  if (ratings.error || history.error || workload.error) throw new Error("Cannot load suggested helpers");
  const counts = new Map<string, number>();
  for (const row of workload.data) counts.set(row.helper_id, (counts.get(row.helper_id) ?? 0) + 1);
  const averages = new Map(ratings.data.map(row => [row.user_id, row.avg_rating]));
  const names = new Map(candidates.data.map(row => [row.id, row.display_name]));
  const helpers = candidates.data.map(row => ({ id: row.id, courses: row.help_courses,
    avgRating: averages.get(row.id) ?? null, sessionsThisWeek: counts.get(row.id) ?? 0 }));
  const partners = new Set(history.data.map(row => row.asker_id === user.id ? row.helper_id : row.asker_id));
  return suggestHelpers({ courseCode, askerId: user.id }, helpers, partners)
    .map(match => ({ ...match, name: names.get(match.helper.id)! }));
}
