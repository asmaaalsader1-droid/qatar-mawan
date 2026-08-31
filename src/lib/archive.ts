import { createServiceClient } from "@/lib/supabase/server";

const ARCHIVE_KEY = "archived_clients";

/** قراءة قائمة معرّفات العملاء المؤرشفين. */
export async function getArchivedClientIds(): Promise<Set<string>> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("settings")
    .select("value")
    .eq("key", ARCHIVE_KEY)
    .maybeSingle();
  const ids = (data?.value as { ids?: string[] } | null)?.ids ?? [];
  return new Set(ids);
}

/** أرشفة عميل (إضافته لقائمة المؤرشفين). */
export async function archiveClient(clientId: string): Promise<void> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("settings")
    .select("value")
    .eq("key", ARCHIVE_KEY)
    .maybeSingle();
  const ids = (data?.value as { ids?: string[] } | null)?.ids ?? [];
  if (!ids.includes(clientId)) ids.push(clientId);
  await supabase
    .from("settings")
    .upsert({ key: ARCHIVE_KEY, value: { ids }, updated_at: new Date().toISOString() }, { onConflict: "key" });
}

/** إلغاء أرشفة عميل (إزالته من قائمة المؤرشفين). */
export async function unarchiveClient(clientId: string): Promise<void> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("settings")
    .select("value")
    .eq("key", ARCHIVE_KEY)
    .maybeSingle();
  const ids = (data?.value as { ids?: string[] } | null)?.ids ?? [];
  const next = ids.filter((id) => id !== clientId);
  await supabase
    .from("settings")
    .upsert({ key: ARCHIVE_KEY, value: { ids: next }, updated_at: new Date().toISOString() }, { onConflict: "key" });
}

/** إلغاء الأرشفة تلقائياً عندما يُدخل العميل بيانات جديدة (حجز/دفع/استفسار). */
export async function autoUnarchiveOnActivity(clientId: string | null): Promise<void> {
  if (!clientId) return;
  const archived = await getArchivedClientIds();
  if (archived.has(clientId)) {
    await unarchiveClient(clientId);
  }
}
