import { notFound } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/server";
import { getDictionary } from "@/lib/i18n";
import { computeBookingAmount } from "@/lib/pricing";
import { CheckoutClient } from "@/components/client/CheckoutClient";
import styles from "./page.module.css";

export default async function CheckoutPage({
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
  const amount = computeBookingAmount(worker ?? {}, duration, durationUnit);

  return (
    <div className="container">
      <h1 className={styles.title}>{dict.checkout.summary}</h1>
      <CheckoutClient booking={booking} amount={amount} duration={duration} durationUnit={durationUnit} dict={dict} locale={locale} />
    </div>
  );
}
