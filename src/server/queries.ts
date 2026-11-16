import "server-only";

import type { Helper, ScoredRequest } from "@/lib/model/priority";
import type { TicketBreakdown } from "@/lib/model/tickets";

// STUB: fixed examples, not the current user's data. A2 will add authorized queries.
export async function getHelpFeed(): Promise<ScoredRequest[]> {
  return [{
    request: {
      id: "example-request", askerId: "example-asker", courseCode: "calc1", minutes: 30,
      createdAt: new Date("2026-11-17T00:00:00Z"), deadline: new Date("2026-11-18T00:00:00Z"),
    },
    score: 1, reasons: { urgency: 0.5, waiting: 0, newPair: 0.5 },
  }];
}

export async function getSuggestedHelpers(requestId: string): Promise<{ helper: Helper; score: number }[]> {
  void requestId;
  return [{
    helper: { id: "example-helper", courses: ["calc1"], avgRating: null, sessionsThisWeek: 0 },
    score: 0.5,
  }];
}

export async function getWallet(): Promise<{
  balance: number;
  entries: { delta: number; reason: string; createdAt: string; sessionId?: string }[];
  weekTickets: number;
  breakdown: TicketBreakdown[];
  draw: { weekStart: string; commitHash: string; prizes: { label: string }[] } | null;
}> {
  return {
    balance: 60,
    entries: [{ delta: 60, reason: "starter", createdAt: "2026-11-17T00:00:00Z" }],
    weekTickets: 0, breakdown: [], draw: null,
  };
}
