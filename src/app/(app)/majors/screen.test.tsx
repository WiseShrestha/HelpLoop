import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("./actions", () => ({ claimDepartmentPerk: vi.fn() }));
const { MajorsScreen } = await import("./screen");
const { DepartmentScreen } = await import("./[dept]/screen");

const courses = [{ code: "calc1", en: "Calculus I", ko: "미적분학 I" }, { code: "major-advice", en: "Choosing a major", ko: "전공 선택 상담" }];
const major = { slug: "electrical engineering", name: "Electrical Engineering", helpers: 2, peopleHelped: 5, perks: 1,
  topCourses: [{ code: "calc1", sessions: 4 }] };
const strip = (html: string) => html.replace(/<!-- -->/g, "");

describe("Major Explorer screens", () => {
  it("lists department cards with counts, top courses and an encoded link", () => {
    const html = strip(renderToString(<MajorsScreen majors={[major]} courses={courses} />));
    expect(html).toContain('href="/majors/electrical%20engineering"');
    expect(html).toContain("2 helpers · 5 people helped · 1 perk");
    expect(html).toContain("Most helped: Calculus I");
    expect(strip(renderToString(<MajorsScreen majors={[]} courses={[]} />))).toContain("No departments to show yet.");
  });

  it("shows a department's helpers, perks with claim state, and the Ask a senior link", () => {
    const html = strip(renderToString(<DepartmentScreen major={major} courses={courses}
      helpers={[{ id: "u1", name: "Ana", year: 2022, peopleHelped: 3, rating: 4.5, courses: ["calc1", "major-advice"] }]}
      perks={[{ id: "p1", title: "Coffee with an EE senior", host_label: "EE, 4th year", description: null, cost_minutes: 60, department: "EE", claimed: true }]} />));
    expect(html).toContain('href="/ask?course=major-advice"');
    expect(html).toContain('href="/u/u1"');
    expect(html).toContain("<li>Choosing a major</li>");
    expect(html).toMatch(/disabled="" name="perk">Claimed<\/button>/);
  });
});
