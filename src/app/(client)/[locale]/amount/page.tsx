import { getDictionary } from "@/lib/i18n";
import { AmountSummary } from "@/components/maawen/AmountSummary";
import { PageHeader, PageFooter } from "@/components/maawen/MaawenLayout";

export const metadata = {
  title: "ملخص الطلب الرسمي",
};

export default async function AmountPage({
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
      <main style={{ padding: "16px 0" }}>
        <AmountSummary locale={locale} />
      </main>
      <PageFooter isAr={isAr} locale={locale} />
    </div>
  );
}