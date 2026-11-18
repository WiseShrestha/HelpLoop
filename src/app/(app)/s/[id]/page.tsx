import { z } from "zod";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { SessionScreen } from "./screen";

export const metadata = { title: "HelpLoop | 공부 세션 · Study session" };

export default async function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success || !getSupabaseEnv()) notFound();
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect("/");
  const row = await db.from("sessions").select("id,helper_id,asker_id,status,scheduled_at,created_at,minutes,place,helper_confirmed_at,asker_confirmed_at,covered,rating")
    .eq("id", id).or(`helper_id.eq.${user.id},asker_id.eq.${user.id}`).maybeSingle();
  if (row.error) throw new Error("Unable to load session");
  if (!row.data) notFound();
  const s = row.data;
  const [names, balance, award] = await Promise.all([
    db.from("profiles").select("id,display_name").in("id", [s.asker_id, s.helper_id]),
    db.rpc("my_balance"),
    s.status === "completed" && s.helper_id === user.id
      ? db.from("ticket_awards").select("tickets").eq("session_id", id).maybeSingle() : null,
  ]);
  if (names.error || balance.error || award?.error) throw new Error("Unable to load session details");
  const name = (id: string) => names.data.find(person => person.id === id)?.display_name ?? "—";
  return <SessionScreen session={{ id, status: s.status, helper: name(s.helper_id), asker: name(s.asker_id),
    isHelper: s.helper_id === user.id, helperConfirmed: !!s.helper_confirmed_at, askerConfirmed: !!s.asker_confirmed_at,
    time: s.scheduled_at, ends: Math.max(Date.parse(s.created_at), Date.parse(s.scheduled_at)) + s.minutes * 60000,
    minutes: s.minutes, place: s.place, covered: s.covered, rating: s.rating, balance: balance.data, tickets: award?.data?.tickets ?? null }} />;
}
