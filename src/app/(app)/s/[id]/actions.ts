"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { completeSessionRewards } from "@/server/rewards";

export type Feedback = "saved" | "early" | "invalid" | "closed" | "error" | "tickets" | "reported" | null;

export async function updateSession(id: string, _prev: Feedback, form: FormData): Promise<Feedback> {
  if (!z.uuid().safeParse(id).success) return "closed";
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return "closed";
  const row = await db.from("sessions").select("status, helper_id, asker_id, helper_confirmed_at, asker_confirmed_at")
    .eq("id", id).or(`helper_id.eq.${user.id},asker_id.eq.${user.id}`).maybeSingle();
  if (row.error) return "error";
  if (!row.data) return "closed";
  const s = row.data;
  const intent = form.get("intent");
  if (intent === "report") {
    const reason = form.get("reason");
    if (typeof reason !== "string" || !reason.trim() || reason.length > 1000) return "invalid";
    const { error } = await db.from("reports").insert({ session_id: id, reporter_id: user.id, reason: reason.trim() });
    return error ? "error" : "reported";
  }
  let award = false;
  if (intent === "retry" && s.status === "completed") award = true;
  else if (s.status !== "scheduled") return "closed";
  else if (intent === "cancel") {
    const { error } = await db.rpc("cancel_session", { p_session: id });
    if (error) return "error";
  } else if (intent === "confirm") {
    const helper = s.helper_id === user.id;
    if (helper ? s.helper_confirmed_at : s.asker_confirmed_at) return "closed";
    const covered = form.get("covered");
    const rating = Number(form.get("rating"));
    if (helper ? typeof covered !== "string" || !covered.trim() || covered.length > 1000
      : !Number.isInteger(rating) || rating < 1 || rating > 5) return "invalid";
    const { data, error } = await db.rpc("confirm_session", { p_session: id,
      ...(helper ? { p_covered: String(covered).trim() } : { p_rating: rating }) });
    if (error) return error.message.includes("could have ended") ? "early" : "error";
    award = data === "completed";
  } else return "invalid";
  let result: Feedback = "saved";
  if (award) {
    try { await completeSessionRewards(id); } catch { result = "tickets"; }
  }
  revalidatePath(`/s/${id}`);
  revalidatePath("/");
  return result;
}
