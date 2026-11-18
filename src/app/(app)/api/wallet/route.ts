import { getWallet } from "@/server/queries";

export async function GET() {
  const headers = { "Cache-Control": "private, no-store" };
  try {
    const { balance, weekTickets } = await getWallet();
    return Response.json({ balance, weekTickets }, { headers });
  } catch (error) {
    return new Response(null, { headers, status: error instanceof Error && error.message === "Sign in to see your wallet" ? 401 : 503 });
  }
}
