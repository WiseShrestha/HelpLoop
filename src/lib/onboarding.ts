import { z } from "zod";

export const onboardingSchema = z.object({
  display_name: z.string().trim().min(1).max(20),
  entry_year: z.coerce.number().int().min(2000).max(2030),
  department: z.string().trim().max(80).transform(value => value || "undeclared"),
  bio: z.string().trim().max(200),
  real_name: z.string().trim().min(1).max(40),
  student_no: z.string().trim().regex(/^[0-9]{8}$/),
  kaist_email: z.string().trim().toLowerCase().regex(/^[^@\s]+@kaist\.ac\.kr$/),
  help_courses: z.array(z.string().min(1).max(80)).max(30).transform(values => [...new Set(values)]),
  integrity: z.literal("on"),
  consent: z.literal("on"),
});

export type OnboardingState = {
  error?: "invalid" | "duplicate" | "unavailable" | "session";
  field?: string;
};
export type Offering = { code: string; name_en: string; name_ko: string; kind: string };
