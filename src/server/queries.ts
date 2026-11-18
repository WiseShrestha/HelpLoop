import "server-only";

import type { Helper } from "@/lib/model/priority";
import type { TicketBreakdown } from "@/lib/model/tickets";

export { getHelpFeed } from "./helpFeed";

// Fixed examples until A2 implements these queries.
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
