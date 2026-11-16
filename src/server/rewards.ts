"use server";

import "server-only";

// STUB: sample results only. A1 will authorize callers and write ticket awards.
export async function completeSessionRewards(sessionId: string): Promise<{ tickets: number }> {
  void sessionId;
  return { tickets: 0 };
}

export async function recomputeWeekTickets(weekStart: Date): Promise<number> {
  void weekStart;
  return 0;
}
