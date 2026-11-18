"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export type Result = "accepted" | "cancelled" | "taken" | "expired" | "invalid" | "error" | "login" | null;

export async function changeRequest(id: string, _previous: Result, form: FormData): Promise<Result> {
  if (!z.uuid().safeParse(id).success) return "invalid";
  try {
    const db = await createClient();
    const { data: { user } } = await db.auth.getUser();
    if (!user) return "login";
    const intent = form.get("intent");
    if (intent === "cancel") {
      const result = await db.from("requests").update({ status: "cancelled" })
        .eq("id", id).eq("asker_id", user.id).eq("status", "open").select("id").maybeSingle();
      if (result.error) return "error";
      if (!result.data) return "taken";
    } else if (intent === "accept") {
      const time = form.get("scheduled");
      const place = form.get("place");
      if (typeof time !== "string" || !/^\d{4}-\d\d-\d\dT\d\d:\d\d$/.test(time)
        || typeof place !== "string" || !place.trim() || place.trim().length > 60) return "invalid";
      const start = Date.parse(time + ":00+09:00");
      if (!Number.isFinite(start) || start <= Date.now() || new Date(start + 32400000).toISOString().slice(0,16) !== time) return "invalid";
      const { error } = await db.rpc("accept_request", { p_request: id, p_place: place.trim(), p_scheduled_at: new Date(start).toISOString() });
      if (error) {
        if (error.message.includes("passed its deadline")) return "expired";
        if (error.message.includes("no longer open") || error.message.includes("no longer available")) return "taken";
        return "error";
      }
    } else return "invalid";
    revalidatePath(`/r/${id}`);
    revalidatePath("/");
    return intent === "accept" ? "accepted" : "cancelled";
  } catch { return "error"; }
}
