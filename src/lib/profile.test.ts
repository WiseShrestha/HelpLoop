import { describe, expect, it } from "vitest";
import { loopLayout, partnerGroups, tableCompanions } from "./profile";

describe("partnerGroups", () => {
  it("counts each partner once, by entry year and department", () => {
    const sessions = [
      { helper_id: "me", asker_id: "a" }, { helper_id: "a", asker_id: "me" }, // same person twice
      { helper_id: "me", asker_id: "b" }, { helper_id: "c", asker_id: "me" }, { helper_id: "x", asker_id: "y" },
    ];
    const profiles = [
      { id: "a", entry_year: 2024, department: "EE" }, { id: "b", entry_year: 2024, department: "ee " },
      { id: "c", entry_year: 2026, department: "undeclared" }, { id: "x", entry_year: 2020, department: "CS" },
    ];
    expect(partnerGroups("me", sessions, profiles)).toEqual([
      { year: 2024, department: "EE", people: 2 }, { year: 2026, department: "undeclared", people: 1 },
    ]);
  });
});

describe("tableCompanions", () => {
  it("counts distinct people met at tables I hosted or joined", () => {
    const tables = [{ id: "t1", host_id: "me" }, { id: "t2", host_id: "h" }, { id: "t3", host_id: "z" }];
    const joins = [{ table_id: "t1", user_id: "a" }, { table_id: "t2", user_id: "me" }, { table_id: "t2", user_id: "a" },
      { table_id: "t3", user_id: "q" }];
    expect(tableCompanions("me", tables, joins)).toBe(2); // a (twice) and host h; not z or q
  });
});

describe("loopLayout", () => {
  it("places members clockwise from the top", () => {
    expect(loopLayout(4, 100, 40)).toEqual([{ x: 50, y: 10 }, { x: 90, y: 50 }, { x: 50, y: 90 }, { x: 10, y: 50 }]);
  });
});
