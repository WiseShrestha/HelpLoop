import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { getSuggestedHelpers } from "@/server/queries";
import { RequestScreen } from "./screen";

export const metadata = { title: "HelpLoop | 도움 요청 · Study request" };
const columns = "topic, details, minutes, deadline, place, status, course_code, is_anonymous, asker_id";

export default async function RequestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return <RequestScreen id={id} gate="closed" />;
  if (!getSupabaseEnv()) return <RequestScreen id={id} gate="error" />;
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return <RequestScreen id={id} gate="login" />;
  const [board, session] = await Promise.all([
    db.from("request_board").select(columns).eq("id", id).maybeSingle(),
    db.from("sessions").select("id, scheduled_at, place").eq("request_id", id)
      .or(`asker_id.eq.${user.id},helper_id.eq.${user.id}`).neq("status", "cancelled").order("created_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  if (board.error || session.error) return <RequestScreen id={id} gate="error" />;
  let row = board.data;
  if (!row && session.data) {
    const result = await db.from("requests").select(columns).eq("id", id).maybeSingle();
    if (result.error) return <RequestScreen id={id} gate="error" />;
    row = result.data;
  }
  if (!row?.status || !row.course_code || !row.deadline) return <RequestScreen id={id} gate="closed" />;
  const owner = row.asker_id === user.id;
  const status = row.status === "open" && new Date(row.deadline) <= new Date() ? "expired" : row.status;
  const [course, person, helpers] = await Promise.all([
    db.from("courses").select("name_en, name_ko").eq("code", row.course_code).maybeSingle(),
    !owner && !row.is_anonymous && row.asker_id ? db.from("profiles").select("display_name").eq("id", row.asker_id).maybeSingle() : null,
    owner && status === "open" ? getSuggestedHelpers(id).catch(() => null) : [],
  ]);
  if (course.error || person?.error) return <RequestScreen id={id} gate="error" />;
  return <RequestScreen id={id} data={{ owner, status, topic: row.topic ?? "", details: row.details,
    minutes: row.minutes, deadline: row.deadline, place: row.place ?? "", course: course.data,
    name: person?.data?.display_name ?? null, helpers: helpers?.map(item => item.name) ?? null, session: session.data }} />;
}
