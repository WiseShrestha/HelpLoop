// Lottery tickets: the reward for helping.
// Rules (docs/SPEC.md §5.1):
//  - 1 ticket per 30 minutes helped
//  - ×1.5 the first time two people ever study together (networking bonus)
//  - same pair, same week: 1st and 2nd session ×1, 3rd ×0.5, 4th and later ×0
//  - × rating factor from the asker's 1–5 rating
//  - at most 10 tickets per helper per week
// Credits (time bank) are separate and never diminished: see ledger.ts.

export type CompletedSession = {
  id: string;
  helperId: string;
  askerId: string;
  minutes: number;
  rating: 1 | 2 | 3 | 4 | 5;
  completedAt: Date;
};

export const TICKET_RULES = {
  minutesPerTicket: 30,
  newPairMultiplier: 1.5,
  sameWeekPairFactors: [1, 1, 0.5, 0] as const, // index = earlier sessions this week with the same pair
  ratingFactors: { 1: 0, 2: 0.25, 3: 0.75, 4: 1, 5: 1 } as const,
  weeklyCapPerHelper: 10,
} as const;

export type TicketBreakdown = {
  sessionId: string;
  helperId: string;
  base: number;
  newPair: boolean;
  pairFactor: number;
  ratingFactor: number;
  tickets: number; // before the weekly cap
};

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

/** Monday 00:00 KST of the week containing `d`, returned as a UTC Date. */
export function weekStartKST(d: Date): Date {
  const kst = new Date(d.getTime() + KST_OFFSET_MS);
  const daysSinceMonday = (kst.getUTCDay() + 6) % 7;
  const mondayKst = Date.UTC(kst.getUTCFullYear(), kst.getUTCMonth(), kst.getUTCDate() - daysSinceMonday);
  return new Date(mondayKst - KST_OFFSET_MS);
}

function pairKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

function round2(x: number): number {
  return Math.round(x * 100) / 100;
}

/** Per-session tickets for every session in `history`, in completion order (no cap applied). */
export function sessionTickets(history: CompletedSession[]): TicketBreakdown[] {
  const sorted = [...history].sort(
    (a, b) => a.completedAt.getTime() - b.completedAt.getTime() || a.id.localeCompare(b.id),
  );
  const everCount = new Map<string, number>();
  const weekCount = new Map<string, number>();
  const out: TicketBreakdown[] = [];

  for (const s of sorted) {
    const key = pairKey(s.helperId, s.askerId);
    const wkKey = `${key}#${weekStartKST(s.completedAt).getTime()}`;
    const priorEver = everCount.get(key) ?? 0;
    const priorWeek = weekCount.get(wkKey) ?? 0;

    const factors = TICKET_RULES.sameWeekPairFactors;
    const pairFactor = factors[Math.min(priorWeek, factors.length - 1)];
    const newPair = priorEver === 0;
    const ratingFactor = TICKET_RULES.ratingFactors[s.rating];
    const base = s.minutes / TICKET_RULES.minutesPerTicket;
    const tickets = round2(base * pairFactor * ratingFactor * (newPair ? TICKET_RULES.newPairMultiplier : 1));

    out.push({ sessionId: s.id, helperId: s.helperId, base, newPair, pairFactor, ratingFactor, tickets });
    everCount.set(key, priorEver + 1);
    weekCount.set(wkKey, priorWeek + 1);
  }
  return out;
}

/** Tickets per helper for the week starting `weekStart` (Monday 00:00 KST), with the weekly cap. */
export function weeklyTickets(history: CompletedSession[], weekStart: Date): Map<string, number> {
  const start = weekStartKST(weekStart).getTime();
  const byId = new Map(history.map((s) => [s.id, s]));
  const totals = new Map<string, number>();
  for (const b of sessionTickets(history)) {
    const s = byId.get(b.sessionId)!;
    if (weekStartKST(s.completedAt).getTime() !== start) continue;
    totals.set(b.helperId, round2((totals.get(b.helperId) ?? 0) + b.tickets));
  }
  for (const [id, t] of totals) totals.set(id, Math.min(t, TICKET_RULES.weeklyCapPerHelper));
  return totals;
}
