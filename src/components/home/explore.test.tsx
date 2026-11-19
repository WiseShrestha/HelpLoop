import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("./live-feed", () => ({ LiveFeed: () => null }));
const { HomeScreen } = await import("./home");
const hrefs = (html: string) => {
  const nav = html.match(/<nav[^>]*aria-labelledby="explore-heading"[\s\S]*?<\/nav>/)?.[0] ?? "";
  return [...nav.matchAll(/href="([^"]+)"/g)].map((m) => m[1]);
};

describe("homepage Explore links", () => {
  it("shows signed-out visitors only the public pages", () => {
    expect(hrefs(renderToString(<HomeScreen configured={false} />))).toEqual(["/stuck", "/model"]);
  });

  it("shows signed-in students every new page", () => {
    expect(hrefs(renderToString(<HomeScreen configured signedIn sessions={[]} ownRequests={[]} />)))
      .toEqual(["/tables", "/stuck", "/draw", "/leaderboard", "/majors", "/model"]);
  });
});
