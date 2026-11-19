"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/server/adminData";
import { DrawError } from "@/server/drawCore";
import { createDraw, runDraw } from "@/server/draws";
import { supabaseRewardsStore } from "@/server/rewardsStore";
import { kstDate, recomputeWeek } from "@/server/ticketAwards";
import { weekStartKST } from "@/lib/model/tickets";

// Public endpoints like every server action: each one re-checks that the caller is an admin.

const week = (form: FormData) => {
  const value = String(form.get("week") ?? "");
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : kstDate(weekStartKST(new Date()));
};
const weekDate = (key: string) => new Date(`${key}T12:00:00+09:00`);

function back(key: string, result: { msg?: string; err?: string }): never {
  const params = new URLSearchParams({ week: key, ...result });
  redirect(`/admin?${params}`);
}

function message(e: unknown) {
  return e instanceof DrawError ? e.message : "Something went wrong. Check the server logs and try again.";
}

export async function createDrawAction(form: FormData) {
  await requireAdmin();
  const key = week(form);
  const prizes = String(form.get("prizes") ?? "").split("\n").map((label) => ({ label: label.trim() })).filter((p) => p.label);
  let err: string | undefined;
  try { await createDraw(weekDate(key), String(form.get("hash") ?? ""), prizes); } catch (e) { err = message(e); }
  back(key, err ? { err } : { msg: "Draw published. Keep the seed somewhere safe until the reveal." });
}

export async function runDrawAction(form: FormData) {
  await requireAdmin();
  const key = week(form);
  let err: string | undefined;
  try { await runDraw(weekDate(key), String(form.get("seed") ?? "").trim()); } catch (e) { err = message(e); }
  back(key, err ? { err } : { msg: "Draw complete. Winners and seed are published." });
}

export async function disputeAction(form: FormData) {
  const { userId } = await requireAdmin();
  const key = week(form);
  const id = z.uuid().safeParse(form.get("session"));
  if (!id.success) back(key, { err: "Unknown session" });
  const admin = createAdminClient();
  const session = await admin.from("sessions").select("status,completed_at").eq("id", id.data).maybeSingle();
  if (session.error || !session.data?.completed_at || session.data.status !== "completed") back(key, { err: "Only completed sessions can be disputed" });
  const sessionWeek = kstDate(weekStartKST(new Date(session.data.completed_at)));
  const draw = await admin.from("draws").select("drawn_at").eq("week_start", sessionWeek).maybeSingle();
  if (draw.error) back(key, { err: "Couldn't check the draw" });
  if (draw.data?.drawn_at) back(key, { err: "That week's draw has already been run; its ticket table is final" });
  const updated = await admin.from("sessions").update({ status: "disputed" }).eq("id", id.data).eq("status", "completed");
  if (updated.error) back(key, { err: "Couldn't dispute the session" });
  try {
    await recomputeWeek(supabaseRewardsStore(admin), userId, new Date(session.data.completed_at));
  } catch {
    back(key, { err: "Session disputed, but recomputing tickets failed. Run the draw (it recomputes) or retry." });
  }
  back(key, { msg: "Session disputed and its tickets removed. Credits are unchanged." });
}

export async function resolveReportAction(form: FormData) {
  await requireAdmin();
  const key = week(form);
  const id = z.uuid().safeParse(form.get("report"));
  if (!id.success) back(key, { err: "Unknown report" });
  const { error } = await createAdminClient().from("reports").update({ resolved_at: new Date().toISOString() })
    .eq("id", id.data).is("resolved_at", null);
  back(key, error ? { err: "Couldn't resolve the report" } : { msg: "Report resolved." });
}
