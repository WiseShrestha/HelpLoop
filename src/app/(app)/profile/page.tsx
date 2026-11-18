import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { ProfileScreen } from "./screen";

export const metadata = { title: "HelpLoop | 내 프로필 · My profile" };

export default async function ProfilePage() {
  if (!getSupabaseEnv()) return <ProfileScreen configured={false} />;
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return <ProfileScreen configured />;
  const profile = await db.from("profiles").select("display_name, department, entry_year, bio, help_courses")
    .eq("id", user.id).maybeSingle();
  if (profile.error) return <ProfileScreen configured unavailable />;
  if (!profile.data) redirect("/onboarding");
  const codes = profile.data.help_courses;
  const topics = codes.length ? await db.from("courses").select("code, name_en, name_ko").in("code", codes) : { data: [], error: null };
  if (topics.error) return <ProfileScreen configured unavailable />;
  return <ProfileScreen configured profile={profile.data} topics={topics.data} />;
}
