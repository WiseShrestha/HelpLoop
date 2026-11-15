// Ordering of open requests in a helper's feed, and of helpers suggested for a request.
// Explainable scores, not black boxes: each part is shown in the UI as a reason chip.

export type OpenRequest = {
  id: string;
  askerId: string;
  courseCode: string;
  minutes: number;
  createdAt: Date;
  deadline: Date;
};

export type Helper = {
  id: string;
  courses: string[];
  avgRating: number | null; // 1–5, null if never rated
  sessionsThisWeek: number;
};

export const PRIORITY_WEIGHTS = {
  newPair: 0.5, // you have never studied with this person
  waitingMax: 0.5, // grows to this after 24 h without a helper
} as const;

const HOUR = 60 * 60 * 1000;

export type ScoredRequest = {
  request: OpenRequest;
  score: number;
  reasons: { urgency: number; waiting: number; newPair: number };
};

/**
 * Score = urgency + waiting + newPair.
 *  urgency = 1 / (1 + hoursUntilDeadline / 24)   → 1 when due now, 0.5 when due in 24 h
 *  waiting = 0.5 × min(hoursSincePosted / 24, 1)
 *  newPair = 0.5 if the helper has never had a session with the asker
 * Requests outside the helper's courses, their own, or past deadline are left out.
 */
export function rankRequestsForHelper(
  helper: Pick<Helper, "id" | "courses">,
  requests: OpenRequest[],
  partnersMet: Set<string>,
  now: Date,
): ScoredRequest[] {
  const courses = new Set(helper.courses);
  return requests
    .filter((r) => r.askerId !== helper.id && courses.has(r.courseCode) && r.deadline.getTime() > now.getTime())
    .map((r) => {
      const hoursLeft = (r.deadline.getTime() - now.getTime()) / HOUR;
      const hoursWaiting = Math.max(0, (now.getTime() - r.createdAt.getTime()) / HOUR);
      const reasons = {
        urgency: 1 / (1 + hoursLeft / 24),
        waiting: PRIORITY_WEIGHTS.waitingMax * Math.min(hoursWaiting / 24, 1),
        newPair: partnersMet.has(r.askerId) ? 0 : PRIORITY_WEIGHTS.newPair,
      };
      return { request: r, score: reasons.urgency + reasons.waiting + reasons.newPair, reasons };
    })
    .sort((a, b) => b.score - a.score || a.request.deadline.getTime() - b.request.deadline.getTime());
}

/**
 * Helpers to suggest for a request: must teach the course and not be the asker.
 * Score = newPair 0.5 + rating (avg−3)/4 (unrated counts as 0) − 0.1 per session already this week.
 * The load penalty spreads work so the same few people don't burn out.
 */
export function suggestHelpers(
  request: Pick<OpenRequest, "askerId" | "courseCode">,
  helpers: Helper[],
  partnersOfAsker: Set<string>,
  limit = 5,
): { helper: Helper; score: number }[] {
  return helpers
    .filter((h) => h.id !== request.askerId && h.courses.includes(request.courseCode))
    .map((h) => ({
      helper: h,
      score:
        (partnersOfAsker.has(h.id) ? 0 : PRIORITY_WEIGHTS.newPair) +
        (h.avgRating === null ? 0 : (h.avgRating - 3) / 4) -
        0.1 * h.sessionsThisWeek,
    }))
    .sort((a, b) => b.score - a.score || a.helper.id.localeCompare(b.helper.id))
    .slice(0, limit);
}
