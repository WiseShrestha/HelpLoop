import { notFound } from "next/navigation";
import { z } from "zod";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { loadHelpRecord } from "@/server/helpRecord";
import { RecordScreen } from "./screen";

export const metadata = { title: "HelpLoop | 도움 기록 · Help record", robots: { index: false } };
export const dynamic = "force-dynamic"; // turning the record off must take effect immediately

export default async function HelpRecordPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success || !getSupabaseEnv()) notFound();
  const record = await loadHelpRecord(id);
  if (record.status === "missing") notFound();
  return <RecordScreen record={record} />;
}
