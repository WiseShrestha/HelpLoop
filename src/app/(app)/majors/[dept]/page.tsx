import { notFound, redirect } from "next/navigation";
import { departmentSlug, majorHelpers, majorPerks, majors } from "@/lib/majors";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { loadMajorRows } from "@/server/majors";
import { DepartmentScreen } from "./screen";

export const metadata = { title: "HelpLoop | 전공 탐색 · Major Explorer" };

export default async function DepartmentPage({ params }: { params: Promise<{ dept: string }> }) {
  const { dept } = await params;
  if (!getSupabaseEnv()) notFound();
  let slug: string;
  try { slug = departmentSlug(decodeURIComponent(dept)); } catch { notFound(); }
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect("/");
  const [rows, claims] = await Promise.all([loadMajorRows(db), db.from("perk_claims").select("perk_id").eq("user_id", user.id)]);
  if (claims.error) throw new Error("Unable to load perk claims");
  const major = majors(rows.profiles, rows.stats, rows.perks, rows.helped).find((m) => m.slug === slug);
  if (!major) notFound();
  const claimed = new Set(claims.data.map((c) => c.perk_id));
  return <DepartmentScreen major={major}
    helpers={majorHelpers(slug, rows.profiles, rows.stats)}
    perks={majorPerks(slug, rows.perks).map((p) => ({ ...p, claimed: claimed.has(p.id) }))}
    courses={rows.courses.map((c) => ({ code: c.code, en: c.name_en, ko: c.name_ko }))} />;
}
