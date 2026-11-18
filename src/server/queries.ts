import "server-only";

import type { TicketBreakdown } from "@/lib/model/tickets";

export { getHelpFeed } from "./helpFeed";

export { getSuggestedHelpers } from "./suggestedHelpers";

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
