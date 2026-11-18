// Heuristics that point an admin at sessions worth a second look before the draw.
// A flag is a reason to ask, not proof: honest students can trip one.

export type FlagSession = {
  id: string; helper_id: string; asker_id: string; status: string;
  scheduled_at: string; created_at: string; completed_at: string | null; covered: string | null;
};
export type FlagProfile = { id: string; created_at: string };
export type Flag = "backdated" | "closed_pair" | "new_accounts" | "copied_notes";

export const FLAG_LABELS: Record<Flag, string> = {
  backdated: "Scheduled before it was accepted",
  closed_pair: "Pair only ever studies with each other",
  new_accounts: "Both accounts created within an hour",
  copied_notes: "Same “covered” note as another session",
};

const HOUR = 3_600_000;
const pairKey = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);
const note = (s: string | null) => (s ?? "").trim().toLowerCase().replace(/\s+/g, " ");

/** Flags for each session in `check`, judged against all completed sessions. */
export function flagSessions(check: FlagSession[], all: FlagSession[], profiles: FlagProfile[]): Map<string, Flag[]> {
  const completed = all.filter((s) => s.status === "completed");
  const created = new Map(profiles.map((p) => [p.id, Date.parse(p.created_at)]));
  const partners = new Map<string, Set<string>>();
  const pairCount = new Map<string, number>();
  const notes = new Map<string, number>();
  for (const s of completed) {
    for (const [a, b] of [[s.helper_id, s.asker_id], [s.asker_id, s.helper_id]]) {
      if (!partners.has(a)) partners.set(a, new Set());
      partners.get(a)!.add(b);
    }
    const key = pairKey(s.helper_id, s.asker_id);
    pairCount.set(key, (pairCount.get(key) ?? 0) + 1);
    if (note(s.covered)) notes.set(note(s.covered), (notes.get(note(s.covered)) ?? 0) + 1);
  }

  const result = new Map<string, Flag[]>();
  for (const s of check) {
    const flags: Flag[] = [];
    // The flow is ask → accept → meet; a meeting time before acceptance logs a past event.
    if (Date.parse(s.scheduled_at) < Date.parse(s.created_at) - 5 * 60_000) flags.push("backdated");
    if ((pairCount.get(pairKey(s.helper_id, s.asker_id)) ?? 0) >= 2
      && partners.get(s.helper_id)?.size === 1 && partners.get(s.asker_id)?.size === 1) flags.push("closed_pair");
    const ca = created.get(s.helper_id);
    const cb = created.get(s.asker_id);
    if (ca !== undefined && cb !== undefined && Math.abs(ca - cb) < HOUR) flags.push("new_accounts");
    if (note(s.covered) && (notes.get(note(s.covered)) ?? 0) >= 2) flags.push("copied_notes");
    if (flags.length) result.set(s.id, flags);
  }
  return result;
}
