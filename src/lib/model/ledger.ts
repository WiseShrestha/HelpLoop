// Credits: a time bank. One credit = one minute of help.
// Helping earns minutes, asking spends them, so sessions never create or destroy credit.
// Only the starter grant (and admin grants) add credit; perks remove it.
// The database enforces the same rules (supabase/migrations/0001_init.sql); keep the constants in sync.

export const CREDIT_RULES = {
  starterMinutes: 60,
  overdraftLimit: 30, // a student may go 30 minutes into debt so nobody is ever stuck
} as const;

export type LedgerReason = "starter" | "session_earned" | "session_spent" | "perk" | "admin";

export type LedgerEntry = {
  userId: string;
  delta: number; // minutes, positive or negative
  reason: LedgerReason;
  sessionId?: string;
};

export function balance(userId: string, entries: LedgerEntry[]): number {
  return entries.reduce((sum, e) => (e.userId === userId ? sum + e.delta : sum), 0);
}

/** The two entries written when a session completes. */
export function settleSession(s: { id: string; helperId: string; askerId: string; minutes: number }): LedgerEntry[] {
  if (s.helperId === s.askerId) throw new Error("A student cannot help themselves");
  if (!Number.isInteger(s.minutes) || s.minutes <= 0) throw new Error("Minutes must be a positive integer");
  return [
    { userId: s.helperId, delta: s.minutes, reason: "session_earned", sessionId: s.id },
    { userId: s.askerId, delta: -s.minutes, reason: "session_spent", sessionId: s.id },
  ];
}

/**
 * Whether a student may post a request for `minutes`, given their balance and the
 * minutes already committed in their other open requests.
 */
export function canAsk(currentBalance: number, openRequestMinutes: number, minutes: number): boolean {
  return currentBalance - openRequestMinutes - minutes >= -CREDIT_RULES.overdraftLimit;
}

/** Total credit in circulation. Equals starter + admin grants − perks spent, whatever sessions happen. */
export function moneySupply(entries: LedgerEntry[]): number {
  return entries.reduce((sum, e) => sum + e.delta, 0);
}
