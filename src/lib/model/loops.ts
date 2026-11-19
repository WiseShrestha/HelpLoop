// Close the Loop: when help forms a circle (A helps B, B helps C, C helps A),
// everyone in the circle earns a bonus ticket. Rules (docs/SPEC.md §5.1b):
//  - an edge is a completed session, helper → asker, rated 4 or 5
//  - only edges completed in the 14 days up to the closing session count
//  - a loop has 3 to 5 different people (a 2-person swap is just direct reciprocity)
//  - each set of people earns a loop bonus once, ever
//  - 1 bonus ticket per member, at most 2 loop bonuses per person per KST week
// Pure functions; the server stores awards in loop_bonuses.

export type Edge = {
  sessionId: string;
  helperId: string;
  askerId: string;
  rating: 1 | 2 | 3 | 4 | 5;
  completedAt: Date;
};

export const LOOP_RULES = {
  minLength: 3,
  maxLength: 5,
  windowDays: 14,
  minRating: 4,
  bonusTickets: 1,
  maxBonusesPerWeek: 2,
} as const;

export type Loop = { key: string; members: string[]; sessionIds: string[] };

export function loopKey(members: string[]): string {
  return [...members].sort().join("|");
}

const DAY = 24 * 60 * 60 * 1000;

/**
 * Loops that `closing` completes: directed cycles of 3–5 people that use the edge
 * closing.helper → closing.asker plus qualifying earlier edges. One entry per set of people.
 * `members` starts with the closing helper and follows the direction of help.
 */
export function loopsClosedBy(closing: Edge, history: Edge[]): Loop[] {
  if (closing.rating < LOOP_RULES.minRating || closing.helperId === closing.askerId) return [];
  const end = closing.completedAt.getTime();
  const start = end - LOOP_RULES.windowDays * DAY;

  // Latest qualifying session per directed pair.
  const best = new Map<string, Edge>();
  for (const e of history) {
    if (e.sessionId === closing.sessionId) continue;
    const t = e.completedAt.getTime();
    if (e.rating < LOOP_RULES.minRating || t < start || t > end || e.helperId === e.askerId) continue;
    const k = `${e.helperId}>${e.askerId}`;
    const prev = best.get(k);
    if (!prev || prev.completedAt.getTime() < t) best.set(k, e);
  }
  const out = new Map<string, string[]>();
  for (const e of best.values()) {
    const list = out.get(e.helperId) ?? [];
    list.push(e.askerId);
    out.set(e.helperId, list);
  }
  for (const list of out.values()) list.sort();

  // Paths asker → … → helper, so that with the closing edge they form a cycle.
  const found = new Map<string, Loop>();
  const path = [closing.helperId, closing.askerId];
  const maxEdgesBack = LOOP_RULES.maxLength - 1;

  const walk = (node: string) => {
    for (const next of out.get(node) ?? []) {
      if (next === closing.helperId) {
        if (path.length >= LOOP_RULES.minLength) {
          const members = [...path];
          const key = loopKey(members);
          if (!found.has(key)) {
            const sessionIds = [closing.sessionId];
            for (let i = 1; i < members.length; i++) {
              const to = i + 1 < members.length ? members[i + 1] : members[0];
              sessionIds.push(best.get(`${members[i]}>${to}`)!.sessionId);
            }
            found.set(key, { key, members, sessionIds });
          }
        }
        continue;
      }
      if (path.includes(next) || path.length - 1 >= maxEdgesBack) continue;
      path.push(next);
      walk(next);
      path.pop();
    }
  };
  walk(closing.askerId);
  return [...found.values()].sort((a, b) => a.key.localeCompare(b.key));
}

export type LoopAward = { key: string; userId: string; tickets: number };

/**
 * Bonus tickets for newly closed loops. Skips loops whose set of people was rewarded before,
 * and anyone who already has `maxBonusesPerWeek` loop bonuses this week.
 */
export function loopAwards(
  loops: Loop[],
  rewardedKeys: Set<string>,
  bonusesThisWeek: Map<string, number>,
): LoopAward[] {
  const counts = new Map(bonusesThisWeek);
  const awards: LoopAward[] = [];
  for (const loop of loops) {
    if (rewardedKeys.has(loop.key)) continue;
    for (const userId of [...loop.members].sort()) {
      const n = counts.get(userId) ?? 0;
      if (n >= LOOP_RULES.maxBonusesPerWeek) continue;
      awards.push({ key: loop.key, userId, tickets: LOOP_RULES.bonusTickets });
      counts.set(userId, n + 1);
    }
  }
  return awards;
}
