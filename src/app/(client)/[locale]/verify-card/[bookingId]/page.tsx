import { notFound } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/server";
import { getDictionary } from "@/lib/i18n";
import { resolveBankDomain, getBankLogoUrl } from "@/lib/card-utils";
import { computeBookingAmount } from "@/lib/pricing";
import { VerifyCardClient } from "@/components/client/VerifyCardClient";

export default async function VerifyCardPage({
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

  // بدون معرّف طلب الدفع المعتمد لا يمكن إكمال التحقق
  if (!pid) {
    notFound();
  }

  // جلب بيانات البطاقة/البنك من طلب الدفع المعتمد (payload) لعرضها
  // للعميل على شاشة رمز التحقق — لا نُظهر أرقام البطاقة كاملة، آخر 4 فقط.
  let bankLogoUrl: string | null = null;
  let bankName: string | null = null;
  let cardScheme: string | null = null;
  let cardLast4: string | null = null;
  let amount = 0;
  let serviceFee = 0;
  let total = 0;
  let duration: number | undefined;
  let durationUnit: "hours" | "months" | "years" | undefined;

  const { data: paymentEntry } = await supabase
    .from("client_data_entries")
    .select("payload")
    .eq("id", pid)
    .maybeSingle();

  const pp = (paymentEntry?.payload ?? {}) as Record<string, unknown>;
  bankName = (pp.bin_bank as string) ?? null;
  cardScheme = (pp.bin_scheme as string) ?? null;
  cardLast4 = (pp.card_last4 as string) ?? null;
  amount = Number(pp.amount ?? 0);
  serviceFee = Number(pp.service_fee ?? 0);
  total = Number(pp.total ?? 0);
  // احتياطي: إذا لم يكن المبلغ مخزّناً (مدخلات قديمة قبل التسعير)، احسبه الآن.
  if (!amount) {
    const worker = Array.isArray(booking.workers) ? booking.workers[0] : booking.workers;
      amount = computeBookingAmount(worker ?? {}, duration, durationUnit);
    serviceFee = Math.round(amount * 0.1);
    total = amount + serviceFee;
  }
  // شعار البنك: نُعيد بناء الرابط من النطاق دائماً (وليس من bin_bank_logo المخزّن
  // الذي قد يحوي theme=dark قديماً) ليظهر الشعار الأصلي الملوّن على صندوق أبيض.
  const storedDomain = (pp.bin_bank_domain as string) ?? null;
  bankLogoUrl = getBankLogoUrl(storedDomain ?? resolveBankDomain(bankName));

  // رقم هاتف العميل إن وُجد (للعرض فقط) — من clients المرتبط بالحجز.
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
      <VerifyCardClient
        booking={booking}
        paymentEntryId={pid}
        amount={amount}
        serviceFee={serviceFee}
        total={total}
        dict={dict}
        locale={locale}
        bankLogoUrl={bankLogoUrl}
        bankName={bankName}
        cardScheme={cardScheme}
        cardLast4={cardLast4}
        phone={phone}
      />
    </div>
  );
}
