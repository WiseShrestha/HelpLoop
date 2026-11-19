import { createClient } from "@/lib/supabase/server";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { getWallet } from "@/server/queries";
import { WalletScreen } from "./screen";

export const metadata = { title: "HelpLoop | 내 지갑 · My wallet" };

export default async function WalletPage() {
  if (!getSupabaseEnv()) return <WalletScreen gate="unavailable" />;
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return <WalletScreen gate="login" />;
  let props;
  try {
    const [wallet, perks, claims] = await Promise.all([getWallet(),
      db.from("perks").select("id,title,cost_minutes,department,host_label").eq("active", true).order("cost_minutes"),
      db.from("perk_claims").select("perk_id").eq("user_id", user.id)]);
    if (perks.error || claims.error) throw new Error("Perks unavailable");
    const claimed = new Set(claims.data.map(row => row.perk_id));
    props = { wallet, perks: perks.data.map(p => ({ ...p, claimed: claimed.has(p.id) })) };
  } catch { return <WalletScreen gate="unavailable" />; }
  return <WalletScreen {...props} />;
}
