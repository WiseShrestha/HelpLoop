"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/** F7: the signed-in student turns their own public help record on or off. */
export async function setPublicRecord(form: FormData): Promise<void> {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return;
  const { error } = await db.from("profiles").update({ public_record: form.get("public") === "on" }).eq("id", user.id);
  if (error) throw new Error("Couldn't update the help record setting");
  revalidatePath(`/u/${user.id}`);
  revalidatePath(`/u/${user.id}/record`);
}
