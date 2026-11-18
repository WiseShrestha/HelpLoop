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
  const db = configured ? await createClient() : null;
  const [query, auth] = await Promise.all([searchParams, db?.auth.getUser()]);
  const user = auth?.data.user;
  const [own, sessions] = db && user ? await Promise.all([db.from("requests").select("id, topic").eq("asker_id", user.id)
    .order("created_at", { ascending: false }).limit(30), db.from("sessions").select("id, scheduled_at, place").or(`asker_id.eq.${user.id},helper_id.eq.${user.id}`)
    .order("created_at", { ascending: false }).limit(30)]) : [null, null];
  return <HomeScreen configured={configured} signedIn={Boolean(user)} ownRequests={own?.data ?? null} sessions={sessions?.data ?? null}
    authError={!user && Boolean(query.auth_error)} exampleSessionAt={tomorrowAtTwoKst()} />;
}
