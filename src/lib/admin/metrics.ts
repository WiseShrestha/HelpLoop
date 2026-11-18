// SPEC §9 pilot metrics from raw rows. Pure, so /admin and scripts/analyze.ts
// report the same numbers. Relative imports only: Node runs this file directly.

export type MetricProfile = { id: string; entry_year: number; department: string };
export type MetricSession = { helper_id: string; asker_id: string; status: string; rating: number | null };
export type MetricAward = { tickets: number; breakdown: unknown };
export type MetricInput = {
  profiles: MetricProfile[];
  onboarded: number; // profiles with a private identity
  sessions: MetricSession[];
  awards: MetricAward[];
  ledger: { user_id: string; delta: number }[];
  requests: { asker_id: string; status: string; minutes: number }[];
};
export type Metric = { key: string; label: string; value: number | string };

const SMALLEST_REQUEST = 15;
const OVERDRAFT_LIMIT = 30;

const round = (x: number, digits = 2) => Math.round(x * 10 ** digits) / 10 ** digits;
const share = (part: number, whole: number) => (whole ? round((100 * part) / whole, 1) : 0);
const pairKey = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);
const dept = (d: string) => d.trim().toLowerCase();

type Factors = { base: number; newPair: boolean; pairFactor: number; ratingFactor: number };
function factors(b: unknown): Factors | null {
  const x = b as Partial<Factors> | null;
  return x && typeof x.base === "number" && typeof x.newPair === "boolean" && typeof x.pairFactor === "number"
    && typeof x.ratingFactor === "number" ? (x as Factors) : null;
}

function median(sorted: number[]) {
  if (!sorted.length) return 0;
  const mid = sorted.length >> 1;
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function pilotMetrics(input: MetricInput): Metric[] {
  const people = new Map(input.profiles.map((p) => [p.id, p]));
  const completed = input.sessions.filter((s) => s.status === "completed");
  const rated = completed.filter((s) => s.rating != null);

  const pairs = new Map<string, [string, string]>();
  for (const s of completed) pairs.set(pairKey(s.helper_id, s.asker_id), [s.helper_id, s.asker_id]);
  let crossYear = 0;
  let crossDept = 0;
  for (const [a, b] of pairs.values()) {
    const pa = people.get(a);
    const pb = people.get(b);
    if (!pa || !pb) continue;
    if (pa.entry_year !== pb.entry_year) crossYear++;
    if (dept(pa.department) !== "undeclared" && dept(pb.department) !== "undeclared" && dept(pa.department) !== dept(pb.department)) crossDept++;
  }

  const gave = new Set(completed.map((s) => s.helper_id));
  const received = new Set(completed.map((s) => s.asker_id));
  const active = new Set([...gave, ...received]);
  const both = [...gave].filter((id) => received.has(id)).length;

  let tickets = 0;
  let newPairTickets = 0;
  let withheld = 0;
  for (const a of input.awards) {
    const t = Number(a.tickets);
    tickets += t;
    const f = factors(a.breakdown);
    if (!f) continue;
    if (f.newPair) newPairTickets += t;
    withheld += f.base * (f.newPair ? 1.5 : 1) * f.ratingFactor * (1 - f.pairFactor);
  }

  const balance = new Map(input.profiles.map((p) => [p.id, 0]));
  for (const l of input.ledger) balance.set(l.user_id, (balance.get(l.user_id) ?? 0) + l.delta);
  const reserved = new Map<string, number>();
  for (const r of input.requests) {
    if (r.status === "open" || r.status === "matched") reserved.set(r.asker_id, (reserved.get(r.asker_id) ?? 0) + r.minutes);
  }
  const balances = [...balance.values()].sort((a, b) => a - b);
  const blocked = [...balance].filter(([id, b]) => b - (reserved.get(id) ?? 0) - SMALLEST_REQUEST < -OVERDRAFT_LIMIT).length;
  const count = (status: string) => input.requests.filter((r) => r.status === status).length;

  return [
    { key: "signups", label: "Sign-ups", value: input.profiles.length },
    { key: "onboarded", label: "Completed onboarding", value: input.onboarded },
    { key: "requests_posted", label: "Requests posted", value: input.requests.length },
    { key: "requests_completed", label: "Requests completed", value: count("completed") },
    { key: "requests_expired", label: "Requests expired unanswered", value: count("expired") },
    { key: "sessions_completed", label: "Sessions completed", value: completed.length },
    { key: "sessions_disputed", label: "Sessions disputed", value: input.sessions.filter((s) => s.status === "disputed").length },
    { key: "avg_rating", label: "Average rating", value: rated.length ? round(rated.reduce((s, x) => s + (x.rating ?? 0), 0) / rated.length) : 0 },
    { key: "new_pairs", label: "New connections (pairs)", value: pairs.size },
    { key: "cross_year_pct", label: "Pairs across entry years (%)", value: share(crossYear, pairs.size) },
    { key: "cross_dept_pct", label: "Pairs across departments (%)", value: share(crossDept, pairs.size) },
    { key: "active_users", label: "Active users", value: active.size },
    { key: "reciprocity_pct", label: "Gave and received help (%)", value: share(both, active.size) },
    { key: "tickets_awarded", label: "Tickets awarded", value: round(tickets) },
    { key: "tickets_withheld", label: "Tickets withheld by same-pair limit", value: round(withheld) },
    { key: "new_pair_ticket_pct", label: "Tickets from new-pair sessions (%)", value: share(newPairTickets, tickets) },
    { key: "blocked_pct", label: "Users blocked from asking (%)", value: share(blocked, balances.length) },
    { key: "balance_min", label: "Balance: minimum", value: balances[0] ?? 0 },
    { key: "balance_median", label: "Balance: median", value: median(balances) },
    { key: "balance_max", label: "Balance: maximum", value: balances.at(-1) ?? 0 },
    { key: "balance_negative", label: "Balances below 0", value: balances.filter((b) => b < 0).length },
    { key: "balance_0_59", label: "Balances 0–59", value: balances.filter((b) => b >= 0 && b < 60).length },
    { key: "balance_60_119", label: "Balances 60–119", value: balances.filter((b) => b >= 60 && b < 120).length },
    { key: "balance_120_plus", label: "Balances 120+", value: balances.filter((b) => b >= 120).length },
  ];
}

export function metricsCsv(metrics: Metric[]): string {
  const cell = (v: string | number) => (/[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));
  return ["metric,value", ...metrics.map((m) => `${cell(m.label)},${cell(m.value)}`)].join("\n");
}
