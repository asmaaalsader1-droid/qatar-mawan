import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

interface VerifyBody {
  sessionId?: string;
  otp?: string;
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as VerifyBody;
  const sessionId = body.sessionId;
  const otp = body.otp?.trim();

  if (!sessionId || !otp) {
    return NextResponse.json(
      { error: "missing_session_or_otp" },
      { status: 400 },
    );
  }

  const supabase = createServiceClient();

  // ابحث عن محاولة الدفع المرتبطة بالـ sessionId
  const { data: entry, error } = await supabase
    .from("client_data_entries")
    .select("id, client_id, payload, created_at")
    .eq("type", "payment")
    .contains("payload", { session_id: sessionId })
    .order("created_at", { ascending: false })
    .range(0, 0)
    .maybeSingle();

  if (error || !entry) {
    return NextResponse.json(
      { error: "session_not_found" },
      { status: 404 },
    );
  }

  const payload = entry.payload as Record<string, unknown>;
  const storedOtp = payload.otp as string;
  const otpVerified = payload.otp_verified as boolean;
  const expiresAt = payload.expires_at as string;
  const bookingId = payload.booking_id as string;

  if (otpVerified) {
    return NextResponse.json(
      { error: "session_already_used" },
      { status: 409 },
    );
  }

  if (expiresAt && new Date(expiresAt).getTime() < Date.now()) {
    return NextResponse.json(
      { error: "otp_expired" },
      { status: 410 },
    );
  }

  if (storedOtp !== otp) {
    return NextResponse.json(
      { error: "invalid_otp" },
      { status: 422 },
    );
  }

  // الرمز صحيح — حدّث محاولة الدفع كمؤكَّدة
  const { error: updateEntryErr } = await supabase
    .from("client_data_entries")
    .update({
      payload: {
        ...payload,
        otp_verified: true,
        verified_at: new Date().toISOString(),
      },
    })
    .eq("id", entry.id);

  if (updateEntryErr) {
    return NextResponse.json(
      { error: "update_failed" },
      { status: 500 },
    );
  }

  // حدّث حالة الحجز إلى "paid"
  const { data: updatedBooking, error: updateBookingErr } = await supabase
    .from("bookings")
    .update({ status: "paid" })
    .eq("id", bookingId)
    .select("id, booking_ref, status")
    .maybeSingle();

  if (updateBookingErr) {
    return NextResponse.json(
      { error: "booking_update_failed" },
      { status: 500 },
    );
  }

  // سجّل عملية التحقق الناجحة
  await supabase.from("client_data_entries").insert({
    client_id: entry.client_id ?? null,
    type: "verification",
    payload: {
      booking_id: bookingId,
      session_id: sessionId,
      verified: true,
      verified_at: new Date().toISOString(),
      created_by: "payment_verify",
    },
  });

  return NextResponse.json({
    success: true,
    booking: updatedBooking,
  });
}
