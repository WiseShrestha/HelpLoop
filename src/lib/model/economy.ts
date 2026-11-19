// Economy simulator (docs/SPEC.md §5.5): an agent-based model used to choose the starter grant
// and overdraft limit, and to show judges why they matter. Deterministic for a given seed.
//
// N students, K courses. Each student is strong in 1–2 courses. Every day each student asks for help
// in a weak course with probability p, if the credit rules allow it (otherwise they are "blocked").
// Each student strong in a course sees that course's open requests ranked by §5.4 and takes the top
// one with probability h (at most one session a day). Credits settle as in the time bank.
// Requests stay open for 2 days. 14 days by default.

import { rankRequestsForHelper, type OpenRequest } from "./priority.ts";

export type EconomyParams = {
  students: number; courses: number; askProbability: number; helpProbability: number;
  days: number; starter: number; overdraft: number; seed: string;
};
export type EconomyResult = {
  requests: number; fulfilled: number; fulfilledShare: number;
  attempts: number; needsMetShare: number; // attempts include asks blocked by the credit rules
  blockedStudents: number; blockedShare: number; distinctPairs: number; gini: number;
  totalCredit: number; // always students × starter: sessions move credit, never create it
};

export const ECONOMY_DEFAULTS: Omit<EconomyParams, "starter" | "overdraft"> = {
  students: 60, courses: 6, askProbability: 0.25, helpProbability: 0.5, days: 14, seed: "helploop",
};
export const STARTER_OPTIONS = [0, 30, 60, 120] as const;
export const OVERDRAFT_OPTIONS = [0, 30, 60] as const;

const DAY_MS = 86_400_000;
const MINUTES = [30, 30, 60] as const; // most asks are 30 minutes

/** mulberry32 seeded from a string hash: small, fast and reproducible everywhere. */
export function random(seed: string): () => number {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Gini coefficient of a list of balances, shifted so the minimum is 0 (balances can be negative). */
export function gini(values: number[]): number {
  if (values.length < 2) return 0;
  const min = Math.min(...values);
  const xs = values.map((v) => v - min).sort((a, b) => a - b);
  const total = xs.reduce((s, x) => s + x, 0);
  if (total === 0) return 0;
  const weighted = xs.reduce((s, x, i) => s + (i + 1) * x, 0);
  return Math.round(((2 * weighted) / (xs.length * total) - (xs.length + 1) / xs.length) * 1000) / 1000;
}

export function simulate(params: EconomyParams): EconomyResult {
  const rand = random(`${params.seed}|${params.students}|${params.courses}|${params.askProbability}|${params.helpProbability}|${params.days}`);
  const pick = <T,>(xs: readonly T[]) => xs[Math.floor(rand() * xs.length)];
  const courseIds = Array.from({ length: params.courses }, (_, i) => `c${i}`);
  // The population is drawn first, so every starter/overdraft setting sees the same students.
  const students = Array.from({ length: params.students }, (_, i) => {
    const first = pick(courseIds);
    const strong = rand() < 0.5 ? [first] : [...new Set([first, pick(courseIds)])];
    return { id: `s${i}`, strong, weak: courseIds.filter((c) => !strong.includes(c)) };
  });
  const balance = new Map(students.map((s) => [s.id, params.starter]));
  const blocked = new Set<string>();
  const met = new Map(students.map((s) => [s.id, new Set<string>()]));
  const pairs = new Set<string>();
  let open: OpenRequest[] = [];
  let requests = 0;
  let attempts = 0;
  let fulfilled = 0;
  let seq = 0;

  for (let day = 0; day < params.days; day++) {
    const now = new Date(Date.UTC(2026, 10, 16) + day * DAY_MS + 9 * 3_600_000);
    open = open.filter((r) => r.deadline.getTime() > now.getTime());
    for (const s of students) {
      if (rand() >= params.askProbability || s.weak.length === 0) continue;
      attempts++;
      const minutes = pick(MINUTES);
      const reserved = open.filter((r) => r.askerId === s.id).reduce((sum, r) => sum + r.minutes, 0);
      if (balance.get(s.id)! - reserved - minutes < -params.overdraft) { blocked.add(s.id); continue; }
      open.push({ id: `r${seq++}`, askerId: s.id, courseCode: pick(s.weak), minutes,
        createdAt: now, deadline: new Date(now.getTime() + 2 * DAY_MS) });
      requests++;
    }
    // Helpers act in a fresh random order each day.
    const order = students.map((s) => ({ s, k: rand() })).sort((a, b) => a.k - b.k).map((x) => x.s);
    for (const helper of order) {
      const feed = rankRequestsForHelper({ id: helper.id, courses: helper.strong }, open, met.get(helper.id)!, now);
      if (!feed.length || rand() >= params.helpProbability) continue;
      const r = feed[0].request;
      open = open.filter((x) => x.id !== r.id);
      balance.set(helper.id, balance.get(helper.id)! + r.minutes);
      balance.set(r.askerId, balance.get(r.askerId)! - r.minutes);
      met.get(helper.id)!.add(r.askerId);
      met.get(r.askerId)!.add(helper.id);
      pairs.add(helper.id < r.askerId ? `${helper.id}|${r.askerId}` : `${r.askerId}|${helper.id}`);
      fulfilled++;
    }
  }
  const share = (x: number, of: number) => (of ? Math.round((1000 * x) / of) / 1000 : 0);
  return {
    requests, fulfilled, fulfilledShare: share(fulfilled, requests), attempts, needsMetShare: share(fulfilled, attempts),
    blockedStudents: blocked.size, blockedShare: share(blocked.size, params.students),
    distinctPairs: pairs.size, gini: gini([...balance.values()]),
    totalCredit: [...balance.values()].reduce((sum, b) => sum + b, 0),
  };
}

/** Every starter grant × overdraft setting from SPEC §5.5, same students and seed. */
export function sweep(base: Omit<EconomyParams, "starter" | "overdraft"> = ECONOMY_DEFAULTS) {
  return OVERDRAFT_OPTIONS.flatMap((overdraft) => STARTER_OPTIONS.map((starter) =>
    ({ starter, overdraft, ...simulate({ ...base, starter, overdraft }) })));
}
