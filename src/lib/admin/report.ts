// The presentation report (SPEC §9) as Markdown. Pure; scripts/analyze.ts fetches the rows.
// Relative .ts imports only: Node runs this file directly.
import { weekStartKST } from "../model/tickets.ts";
import { pilotMetrics, type Metric, type MetricInput } from "./metrics.ts";

export type ReportInput = MetricInput & {
  sessions: (MetricInput["sessions"][number] & { completed_at: string | null })[];
};
export type WeekRow = { week: string; sessions: number; newPairs: number; helpers: number; askers: number };

const kstDay = (d: Date) => new Date(d.getTime() + 9 * 3_600_000).toISOString().slice(0, 10);
const pairKey = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);

/** Completed sessions per KST week, and pairs who met for the first time that week. */
export function weeklyRows(sessions: ReportInput["sessions"]): WeekRow[] {
  const done = sessions.filter((s) => s.status === "completed" && s.completed_at)
    .sort((a, b) => Date.parse(a.completed_at!) - Date.parse(b.completed_at!));
  const seen = new Set<string>();
  const weeks = new Map<string, { sessions: number; newPairs: number; helpers: Set<string>; askers: Set<string> }>();
  for (const s of done) {
    const week = kstDay(weekStartKST(new Date(s.completed_at!)));
    const row = weeks.get(week) ?? { sessions: 0, newPairs: 0, helpers: new Set(), askers: new Set() };
    row.sessions++;
    row.helpers.add(s.helper_id);
    row.askers.add(s.asker_id);
    const key = pairKey(s.helper_id, s.asker_id);
    if (!seen.has(key)) { seen.add(key); row.newPairs++; }
    weeks.set(week, row);
  }
  return [...weeks].map(([week, r]) => ({ week, sessions: r.sessions, newPairs: r.newPairs, helpers: r.helpers.size, askers: r.askers.size }));
}

const table = (head: string[], rows: (string | number)[][]) =>
  [`| ${head.join(" | ")} |`, `| ${head.map(() => "---").join(" | ")} |`, ...rows.map((r) => `| ${r.join(" | ")} |`)].join("\n");

export function markdownReport(input: ReportInput, generatedAt: Date): { markdown: string; metrics: Metric[] } {
  const metrics = pilotMetrics(input);
  const weeks = weeklyRows(input.sessions);
  const markdown = [
    "# HelpLoop pilot numbers",
    `Generated ${generatedAt.toISOString()} (UTC). Survey results come from the Google Form, not this report.`,
    "",
    "## Headline metrics (SPEC §9)",
    table(["Metric", "Value"], metrics.map((m) => [m.label, m.value])),
    "",
    "## By week (KST, Monday start)",
    weeks.length ? table(["Week of", "Sessions completed", "New pairs", "Helpers", "Askers"],
      weeks.map((w) => [w.week, w.sessions, w.newPairs, w.helpers, w.askers])) : "No completed sessions yet.",
    "",
  ].join("\n");
  return { markdown, metrics };
}
