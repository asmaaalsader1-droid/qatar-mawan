import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// يعيد أحدث أمر توجيه معلّق للعميل (لم يُستلم بعد) إن وُجد خلال النافذة الزمنية.
// يستخدمه PresenceTracker عند فتح الصفحة: إذا كان المدير قد وجّه العميل إليه وهو
// غير متصل، يُنفَّذ التوجيه فور وصوله بدلاً من ضياعه (البثّ الفوري لا يُخزَّن).
export async function GET(req: NextRequest) {
  const fp = req.nextUrl.searchParams.get("fingerprint");
  if (!fp) {
    return NextResponse.json({ error: "missing_fingerprint" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const since = new Date(Date.now() - 5 * 60 * 1000).toISOString();

  // ابحث عن العميل صاحب البصمة أولاً (لتقتصر الاستعلامات على صفوفه فقط).
  const { data: client } = await supabase
    .from("clients")
    .select("id")
    .eq("fingerprint", fp)
    .maybeSingle();
  if (!client) {
    return NextResponse.json({ pending: false });
  }

  // أحدث توجيه موجّه لهذا العميل في آخر 5 دقائق لم يُبلّغ عنه بعد (received_at فارغ).
  const { data, error } = await supabase
    .from("client_data_entries")
    .select("id, payload")
    .eq("type", "direct_navigate")
    .eq("client_id", client.id)
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) {
    return NextResponse.json({ error: "db_error" }, { status: 500 });
  }

  const entry = data?.[0];
  if (!entry) {
    return NextResponse.json({ pending: false });
  }

  const payload = (entry.payload as Record<string, unknown>) ?? {};
  if (payload.received_at) {
    return NextResponse.json({ pending: false });
  }

  // علّم التوجيه كمستلَم حتى لا يُعاد تنفيذه في كل جلسة.
  await supabase
    .from("client_data_entries")
    .update({ payload: { ...payload, received_at: new Date().toISOString(), received_fingerprint: fp } })
    .eq("id", entry.id);

  return NextResponse.json({
    pending: true,
    path: String(payload.path ?? ""),
    label: String(payload.label ?? ""),
  });
}