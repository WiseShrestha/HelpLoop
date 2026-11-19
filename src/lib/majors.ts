// F5 Major Explorer: department pages built from who helps whom. Pure; the server loads the rows.
// Department is free text, so "EE", "ee " and "Ee" are one department, shown with its most common spelling.

export type MajorProfile = { id: string; display_name: string; entry_year: number; department: string; help_courses: string[] };
export type MajorStat = { user_id: string; people_helped: number; sessions_helped: number; avg_rating: number | null };
export type MajorPerk = { id: string; title: string; host_label: string; description: string | null; cost_minutes: number; department: string | null };
/** A completed session's helper and the course it was for. */
export type HelpedCourse = { helper_id: string; course_code: string };

export type Major = {
  slug: string; name: string; helpers: number; peopleHelped: number;
  topCourses: { code: string; sessions: number }[]; perks: number;
};
export type MajorHelper = { id: string; name: string; year: number; peopleHelped: number; rating: number | null; courses: string[] };

export const departmentSlug = (department: string) => department.trim().toLowerCase().replace(/\s+/g, " ");
const isUndeclared = (slug: string) => slug === "" || slug === "undeclared";

/** A student is a helper if they have helped someone or offer at least one topic. */
const isHelper = (p: MajorProfile, stat?: MajorStat) => (stat?.people_helped ?? 0) > 0 || p.help_courses.length > 0;

const capitals = (s: string) => (s.match(/[A-Z]/g) ?? []).length;

function displayNames(profiles: MajorProfile[]): Map<string, string> {
  const spellings = new Map<string, Map<string, number>>();
  for (const p of profiles) {
    const slug = departmentSlug(p.department);
    const counts = spellings.get(slug) ?? new Map<string, number>();
    const spelling = p.department.trim();
    counts.set(spelling, (counts.get(spelling) ?? 0) + 1);
    spellings.set(slug, counts);
  }
  return new Map([...spellings].map(([slug, counts]) =>
    // Most common spelling; on a tie prefer more capitals ("EE" over "ee"), then alphabetical.
    [slug, [...counts].sort((a, b) => b[1] - a[1] || capitals(b[0]) - capitals(a[0]) || a[0].localeCompare(b[0]))[0][0]]));
}

export function majors(profiles: MajorProfile[], stats: MajorStat[], perks: MajorPerk[], helped: HelpedCourse[]): Major[] {
  const stat = new Map(stats.map((s) => [s.user_id, s]));
  const names = displayNames(profiles);
  const deptOf = new Map(profiles.map((p) => [p.id, departmentSlug(p.department)]));
  const result = new Map<string, Major & { courseCounts: Map<string, number> }>();
  for (const p of profiles) {
    const slug = departmentSlug(p.department);
    if (isUndeclared(slug) || !isHelper(p, stat.get(p.id))) continue;
    const m = result.get(slug) ?? { slug, name: names.get(slug)!, helpers: 0, peopleHelped: 0, topCourses: [], perks: 0, courseCounts: new Map() };
    m.helpers++;
    m.peopleHelped += stat.get(p.id)?.people_helped ?? 0;
    result.set(slug, m);
  }
  for (const h of helped) {
    const m = result.get(deptOf.get(h.helper_id) ?? "");
    if (m) m.courseCounts.set(h.course_code, (m.courseCounts.get(h.course_code) ?? 0) + 1);
  }
  for (const perk of perks) {
    const m = perk.department ? result.get(departmentSlug(perk.department)) : undefined;
    if (m) m.perks++;
  }
  return [...result.values()].map(({ courseCounts, ...m }) => ({
    ...m,
    topCourses: [...courseCounts].map(([code, sessions]) => ({ code, sessions }))
      .sort((a, b) => b.sessions - a.sessions || a.code.localeCompare(b.code)).slice(0, 3),
  })).sort((a, b) => b.peopleHelped - a.peopleHelped || b.helpers - a.helpers || a.name.localeCompare(b.name));
}

export function majorHelpers(slug: string, profiles: MajorProfile[], stats: MajorStat[]): MajorHelper[] {
  const stat = new Map(stats.map((s) => [s.user_id, s]));
  return profiles.filter((p) => departmentSlug(p.department) === slug && isHelper(p, stat.get(p.id)))
    .map((p) => ({ id: p.id, name: p.display_name, year: p.entry_year, peopleHelped: stat.get(p.id)?.people_helped ?? 0,
      rating: stat.get(p.id)?.avg_rating ?? null, courses: p.help_courses }))
    .sort((a, b) => b.peopleHelped - a.peopleHelped || a.year - b.year || a.name.localeCompare(b.name));
}

export const majorPerks = (slug: string, perks: MajorPerk[]) =>
  perks.filter((p) => p.department && departmentSlug(p.department) === slug);
