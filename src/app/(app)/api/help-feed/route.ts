import { getHelpFeed } from "@/server/helpFeed";

export async function GET() {
  const headers = { "Cache-Control": "private, no-store" };
  try {
    const cards = await getHelpFeed();
    return cards ? Response.json(cards, { headers }) : new Response(null, { status: 401, headers });
  } catch {
    return new Response(null, { status: 503, headers });
  }
}
