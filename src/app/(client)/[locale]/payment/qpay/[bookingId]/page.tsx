import { notFound } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/server";
import { getDictionary } from "@/lib/i18n";
import { computeBookingAmount } from "@/lib/pricing";
import { QpayClient } from "@/components/client/QpayClient";

export default async function QpayPage({
  params,
}: {
  params: Promise<{ locale: string; bookingId: string }>;
}) {
  const { locale, bookingId } = await params;
  const dict = getDictionary(locale);

  const supabase = createServiceClient();
  const { data: booking } = await supabase
    .from("bookings")
    .select("*, workers(*)")
    .eq("id", bookingId)
    .maybeSingle();

  if (!booking) notFound();

  // اجلب حمولة حجز العميل (المدة المختارة) لحساب المبلغ الصحيح.
  let duration: number | undefined;
  let durationUnit: "hours" | "months" | "years" | undefined;
  const { data: entries } = await supabase
    .from("client_data_entries")
    .select("payload")
    .eq("type", "booking")
    .order("created_at", { ascending: false });
  for (const e of entries ?? []) {
    const p = (e.payload as Record<string, unknown>) ?? {};
    if (String(p.bookingId ?? p.booking_id ?? "") === booking.id) {
      duration = p.duration != null ? Number(p.duration) : undefined;
      durationUnit = p.duration_unit as "hours" | "months" | "years" | undefined;
      break;
    }
  }

  const worker = Array.isArray(booking.workers) ? booking.workers[0] : booking.workers;
  let amount = computeBookingAmount(worker ?? {}, duration, durationUnit);
  // حجوزات معاون قد لا ترتبط بعاملة (worker_id null) — نقرأ مبلغ الدفعة
  // المطلوبة من حمولة الحجز حتى يعمل الدفع دائماً.
  if (!worker && (!amount || amount === 0)) {
    const { data: mEntries } = await supabase
      .from("client_data_entries")
      .select("payload")
      .eq("client_id", booking.client_id)
      .eq("type", "maawen_booking")
      .order("created_at", { ascending: false })
      .limit(5);
    for (const me of mEntries ?? []) {
      const mp = (me.payload as Record<string, unknown>) ?? {};
      if (String(mp.booking_id ?? mp.bookingId ?? "") !== booking.id) continue;
      const deposit = Number(mp.deposit ?? 0);
      if (deposit > 0) {
        amount = deposit;
        break;
      }
    }
  }
  const serviceFee = Math.round(amount * 0.1);
  const total = amount + serviceFee;

  return (
    <div className="container">
      <QpayClient
        booking={booking}
        amount={amount}
        serviceFee={serviceFee}
        total={total}
        dict={dict}
        locale={locale}
      />
    </div>
  );
}