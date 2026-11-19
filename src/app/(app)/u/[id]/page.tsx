import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { loadPublicProfile } from "@/server/profiles";
import { PublicProfileScreen } from "./screen";

export const metadata = { title: "HelpLoop | 프로필 · Profile" };

export default async function PublicProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success || !getSupabaseEnv()) notFound();
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect("/");
  const profile = await loadPublicProfile(db, user.id, id);
  if (!profile) notFound();
  return <PublicProfileScreen profile={profile} />;
}
