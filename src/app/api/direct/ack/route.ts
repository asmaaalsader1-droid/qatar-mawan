import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// إقرار استلام التوجيه من جهاز العميل: يُعلَّم التوجيه received_at حتى لا يُعاد
// تنفيذه عبر /api/direct/pending في جلسة لاحقة. لا يتطلب مصادقة (معلومة غير حساسة).
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });

  const entryId = String(body.entryId ?? "");
  if (!entryId) return NextResponse.json({ error: "missing_entry_id" }, { status: 400 });

  const supabase = createServiceClient();
  const { data: entry } = await supabase
    .from("client_data_entries")
    .select("id, payload")
    .eq("id", entryId)
    .eq("type", "direct_navigate")
    .maybeSingle();

  if (!entry) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const payload = (entry.payload as Record<string, unknown>) ?? {};
  if (!payload.received_at) {
    await supabase
      .from("client_data_entries")
      .update({ payload: { ...payload, received_at: new Date().toISOString() } })
      .eq("id", entry.id);
  }

  return NextResponse.json({ ok: true });
}