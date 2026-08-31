import { notFound } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/server";
import { getDictionary } from "@/lib/i18n";
import { QpayVerifyClient } from "@/components/client/QpayVerifyClient";
import { maskPhone } from "@/lib/card-utils";

export default async function QpayVerifyPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; bookingId: string }>;
  searchParams: Promise<{ pid?: string }>;
}) {
  const { locale, bookingId } = await params;
  const { pid } = await searchParams;
  const dict = getDictionary(locale);

  const supabase = createServiceClient();
  const { data: booking } = await supabase
    .from("bookings")
    .select("*, workers(*)")
    .eq("id", bookingId)
    .maybeSingle();

  if (!booking) notFound();
  if (!pid) notFound();

  // جلب بيانات الدفع من طلب QPAY المرتبط لعرض المبلغ ورقم الحجز.
  let amount = 0;
  let serviceFee = 0;
  let total = 0;
  let cardLast4: string | null = null;

  const { data: paymentEntry } = await supabase
    .from("client_data_entries")
    .select("payload")
    .eq("id", pid)
    .maybeSingle();

  if (paymentEntry) {
    const pp = (paymentEntry.payload ?? {}) as Record<string, unknown>;
    amount = Number(pp.amount ?? 0);
    serviceFee = Number(pp.service_fee ?? 0);
    total = Number(pp.total ?? 0);
    cardLast4 = (pp.card_last4 as string) ?? null;
  }

  // رقم هاتف العميل (آخر 4 أرقام معروضة).
  let phone: string | null = null;
  if (booking.client_id) {
    const { data: client } = await supabase
      .from("clients")
      .select("phone")
      .eq("id", booking.client_id)
      .maybeSingle();
    phone = (client?.phone as string) ?? null;
  }

  return (
    <div className="container">
      <QpayVerifyClient
        paymentEntryId={pid}
        bookingId={booking.id}
        bookingRef={booking.booking_ref}
        amount={amount}
        serviceFee={serviceFee}
        total={total}
        cardLast4={cardLast4}
        phone={phone}
        dict={dict}
        locale={locale}
      />
    </div>
  );
}