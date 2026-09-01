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

const SOCIAL_IMAGE_URL =
  "https://mawanoi.world/_next/image?url=%2Flogo.png&w=1200&q=75";
const SITE_TITLE = "معاون";
const SITE_DESCRIPTION = "عاملات منزلية متنوعة وخدمات مميزة";

export function generateMetadata(): Metadata {
  const locale = getLocale();
  return {
    title: {
      default: SITE_TITLE,
      template: `%s | ${SITE_TITLE}`,
    },
    description: SITE_DESCRIPTION,
    openGraph: {
      title: SITE_TITLE,
      description: SITE_DESCRIPTION,
      url: "https://mawanoi.world/ar",
      siteName: SITE_TITLE,
      locale: locale === "ar" ? "ar_QA" : "en_US",
      type: "website",
      images: [
        {
          url: SOCIAL_IMAGE_URL,
          alt: SITE_TITLE,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: SITE_TITLE,
      description: SITE_DESCRIPTION,
      images: [SOCIAL_IMAGE_URL],
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
