import { createClient } from "@/lib/supabase/server";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { StuckScreen, type StuckCourse } from "./screen";
import { stuckWeeks } from "./weeks";

export const metadata = { title: "HelpLoop | 막힌 곳 지도 · Stuck Map" };

/** Public (works signed out): stuck_map only returns groups with 3+ requests from 3+ students. */
export default async function StuckPage() {
  if (!getSupabaseEnv()) return <StuckScreen courses={[]} unavailable />;
  const db = await createClient();
  const [map, courses, topics] = await Promise.all([
    db.from("stuck_map").select("course_code,topic_tag,week_start,requests"),
    db.from("courses").select("code,name_ko,name_en").eq("active", true).eq("kind", "course").order("code"),
    db.from("course_topics").select("course_code,tag,label_ko,label_en"),
  ]);
  if (map.error || courses.error || topics.error) return <StuckScreen courses={[]} unavailable />;

  const { current, previous } = stuckWeeks();
  const label = new Map(topics.data.map((t) => [`${t.course_code}|${t.tag}`, { ko: t.label_ko, en: t.label_en }]));
  const view: StuckCourse[] = courses.data.map((c) => {
    const rows = map.data.filter((r) => r.course_code === c.code && r.topic_tag);
    const tags = [...new Set(rows.filter((r) => r.week_start === current || r.week_start === previous).map((r) => r.topic_tag!))];
    const count = (tag: string, week: string) => rows.find((r) => r.topic_tag === tag && r.week_start === week)?.requests ?? 0;
    return {
      code: c.code, name: { ko: c.name_ko, en: c.name_en },
      topics: tags.map((tag) => ({ tag, label: label.get(`${c.code}|${tag}`) ?? { ko: tag, en: tag },
        thisWeek: count(tag, current), lastWeek: count(tag, previous) }))
        .filter((t) => t.thisWeek > 0 || t.lastWeek > 0)
        .sort((a, b) => b.thisWeek - a.thisWeek || b.lastWeek - a.lastWeek),
    };
  });
  return <StuckScreen courses={view} />;
}
