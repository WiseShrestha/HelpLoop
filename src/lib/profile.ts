// Pure helpers for profile pages. No identities leave these functions except as counts.

export type PartnerSession = { helper_id: string; asker_id: string };
export type PartnerProfile = { id: string; entry_year: number; department: string };
export type PartnerGroup = { year: number; department: string; people: number };

/** Distinct study partners of `userId` (either role), counted by entry year and department. */
export function partnerGroups(userId: string, sessions: PartnerSession[], profiles: PartnerProfile[]): PartnerGroup[] {
  const partners = new Set<string>();
  for (const s of sessions) {
    if (s.helper_id === userId) partners.add(s.asker_id);
    else if (s.asker_id === userId) partners.add(s.helper_id);
  }
  const groups = new Map<string, PartnerGroup>();
  for (const p of profiles) {
    if (!partners.has(p.id)) continue;
    const department = p.department.trim() || "undeclared";
    const key = `${p.entry_year}|${department.toLowerCase()}`;
    const g = groups.get(key) ?? { year: p.entry_year, department, people: 0 };
    g.people++;
    groups.set(key, g);
  }
  return [...groups.values()].sort((a, b) => b.people - a.people || a.year - b.year || a.department.localeCompare(b.department));
}

/** People `userId` sat with at Open Tables they hosted or joined (hosts count as at their own table). */
export function tableCompanions(userId: string, tables: { id: string; host_id: string }[], joins: { table_id: string; user_id: string }[]): number {
  const people = new Map<string, Set<string>>();
  for (const t of tables) people.set(t.id, new Set([t.host_id]));
  for (const j of joins) people.get(j.table_id)?.add(j.user_id);
  const met = new Set<string>();
  for (const group of people.values()) {
    if (!group.has(userId)) continue;
    for (const id of group) if (id !== userId) met.add(id);
  }
  return met.size;
}

/** Points on a circle for a loop diagram, starting at the top and going clockwise. */
export function loopLayout(count: number, size: number, radius: number): { x: number; y: number }[] {
  return Array.from({ length: count }, (_, i) => {
    const angle = -Math.PI / 2 + (2 * Math.PI * i) / count;
    return { x: Math.round((size / 2 + radius * Math.cos(angle)) * 10) / 10, y: Math.round((size / 2 + radius * Math.sin(angle)) * 10) / 10 };
  });
}
