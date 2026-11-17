import type { Database } from "@/lib/db/types";

export const durations = ["15", "30", "45", "60", "90", "120"] as const;
export const offeringKinds = ["course", "language", "skill"] as const;
export type Offering = Pick<Database["public"]["Tables"]["courses"]["Row"], "code" | "kind" | "name_en" | "name_ko">;
export type TopicTag = Database["public"]["Tables"]["course_topics"]["Row"];

export type AskField = "course_code" | "topic_tag" | "topic" | "details" | "minutes" | "deadline" | "place" | "is_anonymous";
export type AskState = { error?: "invalid" | "credit" | "session" | "unavailable"; field?: AskField; postedId?: string };
