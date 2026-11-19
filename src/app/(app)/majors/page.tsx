import { redirect } from "next/navigation";
import { majors } from "@/lib/majors";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { loadMajorRows } from "@/server/majors";
import { MajorsScreen } from "./screen";

export const metadata = { title: "HelpLoop | 전공 탐색 · Major Explorer" };

export default async function MajorsPage() {
  if (!getSupabaseEnv()) return <MajorsScreen majors={[]} courses={[]} unavailable />;
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect("/");
  const rows = await loadMajorRows(db).catch(() => null);
  if (!rows) return <MajorsScreen majors={[]} courses={[]} unavailable />;
  return <MajorsScreen majors={majors(rows.profiles, rows.stats, rows.perks, rows.helped)}
    courses={rows.courses.map((c) => ({ code: c.code, en: c.name_en, ko: c.name_ko }))} />;
}
