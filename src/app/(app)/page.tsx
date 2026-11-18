import { HomeScreen } from "@/components/home/home";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseEnv } from "@/lib/supabase/env";
import appIcon from "@/components/home/assets/app-icon.png";

export const metadata = { title: "HelpLoop | Study together", icons: { icon: appIcon.src } };

function tomorrowAtTwoKst() {
  const todayKst = new Date(Date.now() + 9 * 60 * 60 * 1000);
  return new Date(Date.UTC(todayKst.getUTCFullYear(), todayKst.getUTCMonth(), todayKst.getUTCDate() + 1, 5)).toISOString();
}

export default async function Home({ searchParams }: {
  searchParams: Promise<{ auth_error?: string }>;
}) {
  const configured = Boolean(getSupabaseEnv());
  const [query, user] = await Promise.all([
    searchParams,
    configured ? createClient().then(async supabase => (await supabase.auth.getUser()).data.user) : null,
  ]);
  return <HomeScreen configured={configured} signedIn={Boolean(user)}
    authError={!user && Boolean(query.auth_error)} exampleSessionAt={tomorrowAtTwoKst()} />;
}
