import { getDictionary } from "@/lib/i18n";
import { MonthlyBookingForm } from "@/components/maawen/MonthlyBookingForm";
import { PageHeader, PageFooter } from "@/components/maawen/MaawenLayout";

export const metadata = {
  title: "عمالة منزلية بالشهر",
};

export default async function MonthlyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const isAr = locale === "ar";
  void getDictionary(locale);

  return (
    <div className="container" style={{ paddingTop: 32 }}>
      <PageHeader isAr={isAr} locale={locale} />

      <div style={{ textAlign: "center", marginBottom: 48, maxWidth: 576, marginInline: "auto" }}>
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-4 py-1.5"
          style={{ background: "var(--color-bg-muted)", color: "var(--color-accent)", fontSize: 12, fontWeight: 700, marginBottom: 16, display: "inline-flex" }}
        >
          ✦ عقود مرنة بأسعار توفّر لك أكثر
        </span>
        <h1 style={{ fontSize: 32, fontWeight: 900, color: "var(--color-primary)", marginBottom: 12 }}>
          عمالة منزلية <span style={{ color: "var(--color-accent)" }}>بالشهر</span>
        </h1>
        <p style={{ color: "var(--color-text-muted)", fontSize: 15, lineHeight: 1.7 }}>
          اختر مدة العقد، نوع الخدمة، الجنسية، ونمط الدوام – وحدّد موعد بدء الخدمة بكل سهولة.
        </p>
      </div>

      <MonthlyBookingForm locale={locale} />

      <PageFooter isAr={isAr} locale={locale} />
    </div>
  );
}