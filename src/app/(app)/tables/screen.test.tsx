import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/lib/supabase/client", () => ({ createClient: vi.fn() }));
vi.mock("./actions", () => ({ openTable: vi.fn(), tableAction: vi.fn() }));
const { TablesScreen } = await import("./screen");

const now = Date.parse("2026-11-19T03:00:00Z"); // 12:00 KST
const table = (id: string, o: object) => ({ id, place: `Place ${id}`, note: null, startsAt: "2026-11-19T02:00:00Z",
  endsAt: "2026-11-19T05:00:00Z", max: 6, course: null, host: "Ana", people: ["Ana"], isHost: false, joined: false, full: false, ...o });

describe("Open Tables screen", () => {
  const html = renderToString(<TablesScreen serverNow={now} offerings={[{ code: "calc1", en: "Calculus I", ko: "미적분학 I", kind: "course" }]}
    defaults={{ starts: "2026-11-19T12:00", ends: "2026-11-19T14:00" }} tables={[
      table("mine", { isHost: true, course: { en: "Calculus I", ko: "미적분학 I" } }),
      table("joined", { joined: true, people: ["Ana", "Ben"] }),
      table("full", { max: 2, people: ["Ana", "Ben"], full: true }),
      table("later", { startsAt: "2026-11-19T06:00:00Z", endsAt: "2026-11-19T07:00:00Z" }),
      table("over", { endsAt: "2026-11-19T02:59:00Z" }),
    ]} />).replace(/<!-- -->/g, "");

  it("groups live and upcoming tables and hides ended ones", () => {
    expect(html.indexOf("Open now")).toBeLessThan(html.indexOf("Place mine"));
    expect(html.indexOf("Starting soon")).toBeLessThan(html.indexOf("Place later"));
    expect(html).not.toContain("Place over");
    expect(html).toContain("2 h 0 min left");
  });

  it("offers the right action for host, member and full tables", () => {
    expect(html).toContain('value="end"');
    expect(html).toContain('value="leave"');
    expect(html).toMatch(/value="join" class="[^"]*" disabled="" name="intent">Full/);
    expect(html).toContain("2/2");
  });

  it("prefills the form with KST times and lists courses", () => {
    expect(html).toContain('value="2026-11-19T12:00"');
    expect(html).toContain('<optgroup label="Courses"><option value="calc1">Calculus I</option>');
  });
});
