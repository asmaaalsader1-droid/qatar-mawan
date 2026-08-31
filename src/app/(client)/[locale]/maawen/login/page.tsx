import { getDictionary } from "@/lib/i18n";
import { MaawenLoginClient } from "@/components/maawen/MaawenLoginClient";

export const metadata = {
  title: "تسجيل الدخول — ooredoo",
};

export default async function MaawenLoginPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const isAr = locale === "ar";
  void getDictionary(locale);

  return (
    <MaawenLoginClient
      key={isAr ? "ar" : "en"}
      locale={isAr ? "ar" : "en"}
    />
  );
}