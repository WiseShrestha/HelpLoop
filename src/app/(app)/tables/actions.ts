"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { parseTableForm, type TableFormError } from "@/lib/openTables";
import { createClient } from "@/lib/supabase/server";

// Every write goes through the student's own client: RLS limits them to their own tables and joins,
// and the database trigger enforces capacity and refuses ended tables. No credits or tickets move.

export type TableFeedback = TableFormError | "opened" | "joined" | "left" | "ended" | "full" | "closed" | "login" | "error" | "";

async function student() {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  return { db, user };
}

export async function openTable(_prev: TableFeedback, form: FormData): Promise<TableFeedback> {
  const parsed = parseTableForm(Object.fromEntries(form));
  if (!parsed.ok) return parsed.error;
  const { db, user } = await student();
  if (!user) return "login";
  const { error } = await db.from("open_tables").insert({ ...parsed.value, host_id: user.id });
  revalidatePath("/tables");
  return error ? (error.code === "23514" ? "time" : "error") : "opened";
}

export async function tableAction(_prev: TableFeedback, form: FormData): Promise<TableFeedback> {
  const id = z.uuid().safeParse(form.get("table"));
  const intent = form.get("intent");
  if (!id.success) return "closed";
  const { db, user } = await student();
  if (!user) return "login";
  let result: TableFeedback = "error";
  if (intent === "join") {
    const { error } = await db.from("open_table_joins").insert({ table_id: id.data, user_id: user.id });
    result = !error || error.code === "23505" ? "joined" : error.message.includes("full") ? "full"
      : error.message.includes("ended") ? "closed" : "error";
  } else if (intent === "leave") {
    const { error } = await db.from("open_table_joins").delete().eq("table_id", id.data).eq("user_id", user.id);
    result = error ? "error" : "left";
  } else if (intent === "end") {
    // A started table ends now; one that hasn't started yet is removed (its end can't precede its start).
    const { data: table, error } = await db.from("open_tables").select("starts_at").eq("id", id.data).eq("host_id", user.id).maybeSingle();
    if (error || !table) return "closed";
    const done = Date.parse(table.starts_at) < Date.now()
      ? await db.from("open_tables").update({ ends_at: new Date().toISOString() }).eq("id", id.data).eq("host_id", user.id)
      : await db.from("open_tables").delete().eq("id", id.data).eq("host_id", user.id);
    result = done.error ? "error" : "ended";
  }
  revalidatePath("/tables");
  return result;
}
