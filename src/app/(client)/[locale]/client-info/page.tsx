import { getDictionary } from "@/lib/i18n";
import { ClientInfoForm } from "@/components/maawen/ClientInfoForm";
import { PageHeader, PageFooter } from "@/components/maawen/MaawenLayout";

export const metadata = {
  title: "معلومات العميل",
};

export default async function ClientInfoPage({
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

      <main style={{ maxWidth: 576, marginInline: "auto", padding: "24px 0" }}>
        <h1 style={{ fontSize: 30, fontWeight: 900, color: "var(--color-primary)", textAlign: "center", marginBottom: 32 }}>
          معلومات العميل
        </h1>
        <div className="bg-white border" style={{ borderRadius: 24, borderColor: "var(--color-border)", padding: "32px 40px" }}>
          <ClientInfoForm locale={locale} />
        </div>
      </main>

      <PageFooter isAr={isAr} locale={locale} />
    </div>
  );
}