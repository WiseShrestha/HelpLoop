import { redirect } from "next/navigation";
import { OnboardingScreen } from "@/components/onboarding/form";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseEnv } from "@/lib/supabase/env";
import appIcon from "@/components/home/assets/app-icon.png";

export const metadata = { title: "HelpLoop | Profile setup", icons: { icon: appIcon.src } };

export default async function Onboarding() {
  const configured = Boolean(getSupabaseEnv());
  if (!configured) return <OnboardingScreen configured={false} />;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return <OnboardingScreen configured />;
  const [catalog, profile, identity] = await Promise.all([
    supabase.from("courses").select("code, name_en, name_ko, kind").eq("active", true).order("code"),
    supabase.from("profiles").select("display_name, entry_year, department, bio, help_courses, consent").eq("id", user.id).maybeSingle(),
    supabase.from("private_profiles").select("user_id").eq("user_id", user.id).maybeSingle(),
  ]);
  if (catalog.error || profile.error || identity.error) return <OnboardingScreen configured unavailable />;
  if (profile.data?.consent && identity.data) redirect("/");
  return <OnboardingScreen configured offerings={catalog.data} initial={profile.data ?? undefined}
    email={user.email?.toLowerCase().endsWith("@kaist.ac.kr") ? user.email : ""} />;
}
