import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { kstInput } from "@/lib/openTables";
import { TablesScreen, type LiveTable } from "./screen";

export const metadata = { title: "HelpLoop | 함께 공부 · Study together" };

const nowIso = () => new Date().toISOString();
/** Now, and default start/end inputs (now → +2 h, KST) for the form. */
function clock() {
  const now = Date.now();
  return { serverNow: now, defaults: { starts: kstInput(new Date(now)), ends: kstInput(new Date(now + 2 * 3_600_000)) } };
}

export default async function TablesPage() {
  if (!getSupabaseEnv()) return <TablesScreen tables={[]} offerings={[]} unavailable />;
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect("/");
  const [tables, offerings] = await Promise.all([
    db.from("open_tables").select("id,host_id,course_code,note,place,starts_at,ends_at,max_people").gt("ends_at", nowIso()).order("starts_at").limit(50),
    db.from("courses").select("code,name_en,name_ko,kind").eq("active", true).order("kind").order("code"),
  ]);
  if (tables.error || offerings.error) return <TablesScreen tables={[]} offerings={[]} unavailable />;
  const ids = tables.data.map((t) => t.id);
  const joins = ids.length ? await db.from("open_table_joins").select("table_id,user_id").in("table_id", ids) : { data: [], error: null };
  if (joins.error) return <TablesScreen tables={[]} offerings={[]} unavailable />;
  const people = [...new Set([...tables.data.map((t) => t.host_id), ...joins.data.map((j) => j.user_id)])];
  const names = people.length ? await db.from("profiles").select("id,display_name").in("id", people) : { data: [], error: null };
  if (names.error) return <TablesScreen tables={[]} offerings={[]} unavailable />;
  const name = (id: string) => names.data.find((p) => p.id === id)?.display_name ?? "—";

  const view: LiveTable[] = tables.data.map((t) => {
    const joined = joins.data.filter((j) => j.table_id === t.id && j.user_id !== t.host_id).map((j) => j.user_id);
    const course = offerings.data.find((c) => c.code === t.course_code);
    return {
      id: t.id, place: t.place, note: t.note, startsAt: t.starts_at, endsAt: t.ends_at, max: t.max_people,
      course: course ? { en: course.name_en, ko: course.name_ko } : null,
      host: name(t.host_id), people: [name(t.host_id), ...joined.map(name)],
      isHost: t.host_id === user.id, joined: joined.includes(user.id),
      full: 1 + joined.length >= t.max_people, // the host always holds one place
    };
  });
  return <TablesScreen tables={view} offerings={offerings.data.map((c) => ({ code: c.code, en: c.name_en, ko: c.name_ko, kind: c.kind }))} {...clock()} />;
}
