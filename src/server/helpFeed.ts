import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { rankRequestsForHelper } from "@/lib/model/priority";

export async function getHelpFeed() {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return null;
  const profile = await db.from("profiles").select("help_courses").eq("id", user.id).single();
  if (profile.error) throw profile.error;
  const courses = profile.data.help_courses;
  if (!courses.length) return [];
  const now = new Date();
  const [board, history, catalog] = await Promise.all([
    db.from("request_board").select("id, asker_id, course_code, topic, details, place, minutes, deadline, created_at, is_anonymous")
      .eq("status", "open").in("course_code", courses).gt("deadline", now.toISOString()).order("deadline").order("id"),
    db.from("sessions").select("asker_id, helper_id").eq("status", "completed").or(`asker_id.eq.${user.id},helper_id.eq.${user.id}`),
    db.from("courses").select("code, kind, name_ko, name_en").in("code", courses),
  ]);
  if (board.error || history.error || catalog.error) throw new Error("Cannot load help feed");
  const rows = board.data.filter(row => row.asker_id !== user.id);
  if (!rows.length) return [];
  // Only resolve identities for open, masked rows that the caller's board already returned.
  // Keep these IDs inside this module for ranking. Never include them in a card.
  const masked = rows.flatMap(row => row.is_anonymous && row.id ? [row.id] : []);
  const identities = masked.length ? await createAdminClient().from("requests").select("id, asker_id")
    .in("id", masked).eq("is_anonymous", true).eq("status", "open") : { data: [], error: null };
  if (identities.error) throw identities.error;
  const hidden = new Map(identities.data.map(row => [row.id, row.asker_id]));
  const visible = [...new Set(rows.flatMap(row => !row.is_anonymous && row.asker_id ? [row.asker_id] : []))];
  const names = visible.length ? await db.from("profiles").select("id, display_name, help_courses").in("id", visible) : { data: [], error: null };
  if (names.error) throw names.error;
  const people = new Map(names.data.map(person => [person.id, person]));
  const partners = new Set(history.data.map(row => row.asker_id === user.id ? row.helper_id : row.asker_id));
  const byId = new Map(rows.map(row => [row.id, row]));
  const offers = new Map(catalog.data.map(course => [course.code, course]));
  const requests = rows.flatMap(row => {
    const askerId = row.asker_id ?? (row.id && hidden.get(row.id));
    if (!row.id || !askerId || !row.course_code || !row.minutes || !row.created_at || !row.deadline) return [];
    return [{ id: row.id, askerId, courseCode: row.course_code, minutes: row.minutes, createdAt: new Date(row.created_at), deadline: new Date(row.deadline) }];
  });
  return rankRequestsForHelper({ id: user.id, courses }, requests, partners, now).flatMap(({ request, reasons }) => {
    const row = byId.get(request.id);
    const course = offers.get(request.courseCode);
    if (!row || !course) return [];
    const person = row.is_anonymous ? undefined : people.get(request.askerId);
    const counterpart = course.code === "korean" ? "english" : course.code === "english" ? "korean" : null;
    return [{
      id: request.id, name: person?.display_name ?? null, course, topic: row.topic, place: row.place, details: row.details,
      minutes: request.minutes, deadline: request.deadline.toISOString(), createdAt: request.createdAt.toISOString(),
      newConnection: reasons.newPair > 0, exchange: !!counterpart && !!person?.help_courses.includes(counterpart),
    }];
  });
}

export type HelpFeedCard = NonNullable<Awaited<ReturnType<typeof getHelpFeed>>>[number];
