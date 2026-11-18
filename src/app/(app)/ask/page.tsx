import { AskScreen } from "@/components/ask/form";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "HelpLoop | Ask for help" };

export default async function AskPage({ searchParams }: { searchParams?: Promise<{ course?: string }> }) {
  const configured = Boolean(getSupabaseEnv());
  if (!configured) return <AskScreen configured={false} />;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return <AskScreen configured />;

  const [courses, tags, balance, reserved] = await Promise.all([
    supabase.from("courses").select("code, kind, name_en, name_ko").eq("active", true).order("code"),
    supabase.from("course_topics").select("course_code, tag, label_en, label_ko").order("tag"),
    supabase.rpc("my_balance"),
    supabase.rpc("my_open_request_minutes"),
  ]);
  if (courses.error || tags.error || balance.error || reserved.error || courses.data.length === 0) {
    return <AskScreen configured unavailable />;
  }
  // e.g. /ask?course=major-advice from Major Explorer's "Ask a senior"; only active codes preselect.
  const wanted = (await searchParams)?.course;
  const initialCourse = courses.data.some((c) => c.code === wanted) ? wanted : undefined;
  return <AskScreen configured data={{ courses: courses.data, tags: tags.data, balance: balance.data, reserved: reserved.data, initialCourse }} />;
}
