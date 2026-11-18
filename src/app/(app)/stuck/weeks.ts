import { weekStartKST } from "@/lib/model/tickets";

const DAY_MS = 86_400_000;
const kstDay = (d: Date) => new Date(d.getTime() + 9 * 3_600_000).toISOString().slice(0, 10);

/** This and last KST week's Monday dates, as stuck_map stores them. */
export function stuckWeeks(now = new Date()) {
  const start = weekStartKST(now);
  return { current: kstDay(start), previous: kstDay(new Date(start.getTime() - 7 * DAY_MS)) };
}
