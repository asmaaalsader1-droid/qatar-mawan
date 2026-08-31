import { headers } from "next/headers";
import { SITE } from "@/config/site";

export function getLocale(): string {
  const h = headers();
  const fromHeader = h.get("x-locale");
  if (fromHeader && SITE.locales.includes(fromHeader as "ar" | "en")) return fromHeader;
  return SITE.defaultLocale;
}
