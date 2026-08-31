import type { Metadata } from "next";
import { headers } from "next/headers";
import type { Viewport } from "next";
import "./globals.css";
import { ToastProvider } from "@/components/ui/Toast";
import { ZoomGuard } from "@/components/client/ZoomGuard";
import { SITE } from "@/config/site";
import { getLocale } from "@/lib/i18n-server";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export function generateMetadata(): Metadata {
  const locale = getLocale();
  const name = locale === "ar" ? SITE.nameAr : SITE.nameEn;
  const tagline = locale === "ar" ? SITE.taglineAr : SITE.taglineEn;
  return {
    title: {
      default: `${name} | ${tagline}`,
      template: `%s | ${name}`,
    },
    description: tagline,
    openGraph: {
      title: name,
      description: tagline,
      locale: locale === "ar" ? "ar_QA" : "en_US",
      type: "website",
    },
    robots: { index: true, follow: true },
  };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = getLocale();
  const lang = locale;
  const dir = locale === "ar" ? "rtl" : "ltr";
  return (
    <html lang={lang} dir={dir} suppressHydrationWarning>
      <head />
      <body>
        <ZoomGuard />
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
