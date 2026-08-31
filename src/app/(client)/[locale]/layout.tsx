import { TopBar } from "@/components/client/TopBar";
import { Header } from "@/components/client/Header";
import { Footer } from "@/components/client/Footer";
import { PresenceTracker } from "@/components/client/PresenceTracker";
import { getDictionary, type Locale } from "@/lib/i18n";
import { notFound } from "next/navigation";

const locales = ["ar", "en"] as const;

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function ClientLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!locales.includes(locale as Locale)) notFound();
  const dict = getDictionary(locale);

  return (
    <div>
      <TopBar locale={locale} dict={dict} />
      <Header dict={dict} locale={locale} />
      <main>{children}</main>
      <Footer dict={dict} locale={locale} />
      <PresenceTracker />
    </div>
  );
}
