import { describe, expect, it } from "vitest";
import { departmentSlug, majorHelpers, majorPerks, majors } from "./majors";

const p = (id: string, department: string, help: string[] = [], year = 2023) =>
  ({ id, display_name: id.toUpperCase(), entry_year: year, department, help_courses: help });
const profiles = [
  p("a", "EE", ["calc1"], 2022), p("b", "ee ", ["phys1"]), p("c", "Ee", [], 2021), // c only helps through sessions
  p("d", "CS", ["prog1"]), p("e", "CS", []), // e has never helped: not a helper
  p("f", "undeclared", ["calc1"]), p("g", "  ", ["calc1"]),
];
const stats = [
  { user_id: "a", people_helped: 3, sessions_helped: 4, avg_rating: 4.5 }, { user_id: "c", people_helped: 1, sessions_helped: 1, avg_rating: 5 },
  { user_id: "d", people_helped: 2, sessions_helped: 2, avg_rating: null }, { user_id: "e", people_helped: 0, sessions_helped: 0, avg_rating: null },
];
const perks = [
  { id: "p1", title: "Coffee with an EE senior", host_label: "EE, 4th year", description: null, cost_minutes: 60, department: "EE" },
  { id: "p2", title: "Lab tour", host_label: "EE PhD", description: null, cost_minutes: 90, department: " ee" },
  { id: "p3", title: "Alumni chat", host_label: "Alumnus", description: null, cost_minutes: 60, department: null },
];
const helped = [
  { helper_id: "a", course_code: "calc1" }, { helper_id: "a", course_code: "calc1" }, { helper_id: "c", course_code: "phys1" },
  { helper_id: "a", course_code: "chem1" }, { helper_id: "a", course_code: "bio1" }, { helper_id: "d", course_code: "prog1" },
];

describe("Major Explorer", () => {
  it("merges spellings of a department and skips undeclared students and non-helpers", () => {
    expect(departmentSlug("  Electrical   Engineering ")).toBe("electrical engineering");
    expect(majors(profiles, stats, perks, helped)).toEqual([
      { slug: "ee", name: "EE", helpers: 3, peopleHelped: 4, perks: 2,
        topCourses: [{ code: "calc1", sessions: 2 }, { code: "bio1", sessions: 1 }, { code: "chem1", sessions: 1 }] },
      { slug: "cs", name: "CS", helpers: 1, peopleHelped: 2, perks: 0, topCourses: [{ code: "prog1", sessions: 1 }] },
    ]);
  });

  it("lists a department's helpers, busiest first, and its perks", () => {
    expect(majorHelpers("ee", profiles, stats).map((h) => [h.id, h.peopleHelped])).toEqual([["a", 3], ["c", 1], ["b", 0]]);
    expect(majorPerks("ee", perks).map((x) => x.id)).toEqual(["p1", "p2"]);
    expect(majorHelpers("nope", profiles, stats)).toEqual([]);
  });
});
