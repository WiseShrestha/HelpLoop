"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { onboardingSchema, type OnboardingState } from "@/lib/onboarding";

export async function saveOnboarding(_previous: OnboardingState, form: FormData): Promise<OnboardingState> {
  const parsed = onboardingSchema.safeParse({ ...Object.fromEntries(form), help_courses: form.getAll("help_courses") });
  if (!parsed.success) return { error: "invalid", field: String(parsed.error.issues[0].path[0]) };
  const values = parsed.data;
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return { error: "session" };
    const [catalog, profile, identity] = await Promise.all([
      supabase.from("courses").select("code").eq("active", true),
      supabase.from("profiles").select("id, consent").eq("id", user.id).maybeSingle(),
      supabase.from("private_profiles").select("user_id").eq("user_id", user.id).maybeSingle(),
    ]);
    if (catalog.error || profile.error || identity.error) return { error: "unavailable" };
    if (values.help_courses.some(code => !catalog.data.some(item => item.code === code))) {
      return { error: "invalid", field: "help_courses" };
    }
    // Never rewrite a completed identity, including on double submission.
    if (!(profile.data?.consent && identity.data)) {
      const publicFields = { display_name: values.display_name, entry_year: values.entry_year,
        department: values.department, bio: values.bio, help_courses: values.help_courses, consent: true };
      const saved = profile.data
        ? await supabase.from("profiles").update(publicFields).eq("id", user.id)
        : await supabase.from("profiles").insert({ id: user.id, ...publicFields });
      if (saved.error) return { error: "unavailable" };
      if (!identity.data) {
        const privateSave = await supabase.from("private_profiles").insert({ user_id: user.id,
          real_name: values.real_name, student_no: values.student_no, kaist_email: values.kaist_email });
        if (privateSave.error) {
          // A concurrent successful submission is safe; another student's number is not.
          if (privateSave.error.code === "23505") {
            const own = await supabase.from("private_profiles").select("user_id").eq("user_id", user.id).maybeSingle();
            if (own.error || !own.data) return { error: "duplicate", field: "student_no" };
          } else return { error: "unavailable" };
        }
      }
    }
  } catch { return { error: "unavailable" }; }
  redirect("/");
}
