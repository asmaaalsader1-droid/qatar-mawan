import { NextRequest, NextResponse } from "next/server";
import { createServiceClient, broadcastNewEntry } from "@/lib/supabase/server";
import { generateBookingRef } from "@/lib/utils";
import { autoUnarchiveOnActivity } from "@/lib/archive";

/**
 * تسجيل حجز من صفحة "معاون" (بالساعة / بالشهر).
 * يُخزَّن كإدخال من نوع `maawen_booking` في client_data_entries
 * ليظهر في لوحة الإدارة (AdminInboxView) بنفس أسلوب استفسارات الحجز.
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });

  const {
    type,
    service,
    hours,
    duration,
    unit_price,
    workers_count,
    nationality,
    date,
    time,
    total,
    deposit,
    remaining,
    service_type,
    contract_duration,
    workersCount,
  } = body as Record<string, unknown>;

  const bookingType = type === "monthly" ? "monthly" : "hourly";
  const serviceName = service ?? service_type ?? "غير محدد";
  const units = bookingType === "monthly" ? (contract_duration ?? duration) : hours;
  const count = workers_count ?? workersCount;
  const amountTotal = total ?? 0;
  const depositAmount = deposit ?? (bookingType === "monthly" ? 30 : Math.round(Number(amountTotal) * 0.25));
  const remainingAmount = remaining ?? Math.max(0, Number(amountTotal) - Number(depositAmount));

  const bookingRef = generateBookingRef();
  const supabase = createServiceClient();

  const fingerprint = request.headers.get("x-fingerprint") || null;
  let clientId: string | null = null;
  if (fingerprint) {
    const { data: existing } = await supabase
      .from("clients")
      .select("id")
      .eq("fingerprint", fingerprint)
      .maybeSingle();
    if (existing) {
      clientId = existing.id;
    } else {
      const { data: created } = await supabase
        .from("clients")
        .insert({ fingerprint, name: "زائر معاون" })
        .select("id")
        .single();
      clientId = created?.id ?? null;
    }
  }

  // العاملة التمثيلية لخدمات "معاون": لا فترة راتب محدّدة وراتبها 27
  // بحيث يعيد computeBookingAmount القيمة 27 وتُصبح الإجمالية بعد رسوم
  // الخدمة (10%) = 30 ر.ق بالضبط على صفحة الدفع.
  const { data: serviceWorker } = await supabase
    .from("workers")
    .select("id")
    .eq("slug", "maawen-service")
    .maybeSingle();

  // سجل حجز حقيقي مرتبط بالعاملة التمثيلية ليعمل نظام الدفع الموجود.
  const { data: booking, error: bookingErr } = await supabase
    .from("bookings")
    .insert({
      booking_ref: bookingRef,
      client_id: clientId,
      worker_id: serviceWorker?.id ?? null,
      status: "pending",
      notes: null,
    })
    .select("id, booking_ref")
    .single();

  if (bookingErr || !booking) {
    return NextResponse.json({ error: "فشل إنشاء الحجز" }, { status: 500 });
  }

  const { data: entryRow, error: insertErr } = await supabase
    .from("client_data_entries")
    .insert({
      client_id: clientId,
      type: "maawen_booking",
      payload: {
        booking_ref: bookingRef,
        booking_id: booking.id,
        booking_type: bookingType,
        service: serviceName,
        units,
        unit_price: unit_price ?? 0,
        workers_count: count ?? 1,
        nationality: nationality ?? "",
        start_date: date ?? null,
        start_time: time ?? null,
        total: Number(amountTotal),
        deposit: Number(depositAmount),
        remaining: Number(remainingAmount),
        created_at: new Date().toISOString(),
      },
    })
    .select("id")
    .single();

  if (insertErr || !entryRow) {
    return NextResponse.json({ error: "فشل حفظ الحجز" }, { status: 500 });
  }

  await autoUnarchiveOnActivity(clientId);

  void broadcastNewEntry({
    clientId: clientId ?? fingerprint ?? null,
    entryId: entryRow.id,
    type: "maawen_booking",
  });

  return NextResponse.json({ ok: true, bookingRef, bookingId: booking.id });
}