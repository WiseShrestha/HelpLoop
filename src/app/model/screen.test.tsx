import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ModelScreen } from "./screen";

describe("/model", () => {
  const html = renderToString(<ModelScreen />).replace(/<!-- -->/g, "");

  it("renders both charts with a legend, end labels and the ringed pilot setting", () => {
    expect(html).toContain('aria-label="Help needs met"');
    expect(html).toContain('aria-label="Students blocked from asking at least once"');
    expect(html).toContain("No overdraft");
    expect(html).toContain("−30 overdraft");
    expect((html.match(/<circle[^>]*r="9"/g) ?? []).length).toBe(2); // pilot ring on each chart
  });

  it("offers every setting as a table and explains the ticket rules", () => {
    expect((html.match(/<tr/g) ?? []).length).toBe(13); // header + 4 starter × 3 overdraft
    expect(html).toContain("1 ticket for every 30 minutes you help.");
    expect(html).toContain("×1.5 the first time");
  });
});
