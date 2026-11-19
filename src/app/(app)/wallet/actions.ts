"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

export async function claimPerk(_previous: string, form: FormData) {
  const id = z.uuid().safeParse(form.get("perk"));
  if (!id.success) return "unavailable";
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return "login";
  const { error } = await db.rpc("claim_perk", { p_perk: id.data });
  revalidatePath("/wallet");
  if (!error) return "claimed";
  if (error.code === "23505") return "already";
  if (error.message.includes("Not enough credit")) return "credit";
  if (error.message.includes("slots")) return "full";
  return "unavailable";
}
