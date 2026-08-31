import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

async function requireAdmin() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: setting } = await supabase
    .from("settings")
    .select("value")
    .eq("key", "admin_email")
    .maybeSingle();
  const adminEmail = (setting?.value as { email?: string } | null)?.email;
  if (adminEmail && user.email === adminEmail) return user;
  return null;
}

function errorResponse(message: string, status = 500) {
  console.error("[delete-client]", message);
  return NextResponse.json({ error: message }, { status });
}

/**
 * حذف مجموعة عملاء في عملية واحدة.
 * نحذف البيانات التابعة أولًا، ونتحقق من كل استجابة حتى لا تبدو العملية ناجحة
 * بينما يفشل حذف جزء من البيانات.
 */
export async function POST(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return errorResponse("غير مصرح", 403);

  const body = await request.json().catch(() => null);
  if (!body) return errorResponse("بيانات غير صالحة", 400);

  const rawIds = (body as { clientIds?: unknown }).clientIds;
  if (!Array.isArray(rawIds)) return errorResponse("clientIds يجب أن تكون مصفوفة", 422);

  const clientIds = [...new Set(rawIds.filter((id): id is string => typeof id === "string" && id.length > 0))];
  if (clientIds.length === 0) return errorResponse("clientIds مطلوب", 422);
  if (clientIds.length > 500) return errorResponse("عدد العملاء المحدد كبير جدًا", 422);

  const supabase = createServiceClient();

  const dailyVisitors = await supabase
    .from("daily_visitors")
    .delete()
    .in("client_id", clientIds);
  if (dailyVisitors.error) return errorResponse(`فشل حذف سجلات الزيارات: ${dailyVisitors.error.message}`);

  const entries = await supabase
    .from("client_data_entries")
    .delete()
    .in("client_id", clientIds);
  if (entries.error) return errorResponse(`فشل حذف بيانات العملاء: ${entries.error.message}`);

  // نُبقي سجلات الحجوزات، لكن نفصلها عن العميل قبل حذف صف العميل.
  const bookings = await supabase
    .from("bookings")
    .update({ client_id: null })
    .in("client_id", clientIds);
  if (bookings.error) return errorResponse(`فشل فصل الحجوزات: ${bookings.error.message}`);

  const deleted = await supabase
    .from("clients")
    .delete()
    .in("id", clientIds)
    .select("id");
  if (deleted.error) return errorResponse(`فشل حذف العملاء: ${deleted.error.message}`);

  // إزالة المعرفات المحذوفة من قائمة الأرشيف إن وُجدت.
  const archiveSetting = await supabase
    .from("settings")
    .select("value")
    .eq("key", "archived_clients")
    .maybeSingle();
  if (archiveSetting.error) return errorResponse(`فشل قراءة الأرشيف: ${archiveSetting.error.message}`);

  const archivedIds = (archiveSetting.data?.value as { ids?: unknown } | null)?.ids;
  if (Array.isArray(archivedIds)) {
    const deletedSet = new Set(clientIds);
    const remainingIds = archivedIds.filter((id): id is string => typeof id === "string" && !deletedSet.has(id));
    if (remainingIds.length !== archivedIds.length) {
      const archiveUpdate = await supabase
        .from("settings")
        .update({ value: { ids: remainingIds }, updated_at: new Date().toISOString() })
        .eq("key", "archived_clients");
      if (archiveUpdate.error) return errorResponse(`فشل تحديث الأرشيف: ${archiveUpdate.error.message}`);
    }
  }

  return NextResponse.json({ ok: true, deleted: deleted.data?.length ?? 0 });
}
