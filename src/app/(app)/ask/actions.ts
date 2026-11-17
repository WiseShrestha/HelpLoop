"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { durations, type AskField, type AskState } from "@/lib/ask";
import { createClient } from "@/lib/supabase/server";

function deadlineInKorea(value: string) {
  return new Date(`${value}:00+09:00`);
}

const askSchema = z.object({
  course_code: z.string().trim().min(1),
  topic_tag: z.string().trim().max(60).transform(value => value || null),
  topic: z.string().trim().min(1).max(80),
  details: z.string().trim().max(500).transform(value => value || null),
  minutes: z.enum(durations).transform(Number),
  deadline: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/).refine(value => {
    const date = deadlineInKorea(value);
    if (!Number.isFinite(date.getTime()) || date.getTime() <= Date.now()) return false;
    return new Date(date.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 16) === value;
  }).transform(value => deadlineInKorea(value).toISOString()),
  place: z.string().trim().min(1).max(60),
  is_anonymous: z.literal("on").optional().transform(value => value === "on"),
});

export async function postRequest(previous: AskState, form: FormData): Promise<AskState> {
  const failure = (error: AskState["error"], field?: AskField): AskState => ({
    postedId: previous.postedId, error, field,
  });
  const parsed = askSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return failure("invalid", parsed.error.issues[0].path[0] as AskField);

  const values = parsed.data;
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return failure("session");

    const { data: course, error: catalogError } = await supabase.from("courses")
      .select("code").eq("code", values.course_code).eq("active", true).maybeSingle();
    if (catalogError) return failure("unavailable");
    if (!course) return failure("invalid", "course_code");

    const { data, error } = await supabase.from("requests")
      .insert({ ...values, asker_id: user.id }).select("id").single();
    if (data) {
      revalidatePath("/ask");
      return { postedId: data.id };
    }
    if (error?.code === "23514" && error.message === "Not enough available credit for this request") {
      revalidatePath("/ask");
      return failure("credit");
    }
    if (error?.code === "23503" && error.message.includes("requests_course_code_topic_tag_fkey")) {
      return failure("invalid", "topic_tag");
    }
    return failure("unavailable");
  } catch {
    return failure("unavailable");
  }
}
