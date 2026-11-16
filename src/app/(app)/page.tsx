import { HomeScreen } from "@/components/home/home";
import { getSupabaseEnv } from "@/lib/supabase/env";
import appIcon from "@/components/home/assets/app-icon.png";

export const metadata = { title: "HelpLoop | Study together", icons: { icon: appIcon.src } };

export default async function Home({ searchParams }: {
  searchParams: Promise<{ auth_error?: string }>;
}) {
  const { auth_error } = await searchParams;
  return <HomeScreen configured={Boolean(getSupabaseEnv())} authError={Boolean(auth_error)} />;
}
