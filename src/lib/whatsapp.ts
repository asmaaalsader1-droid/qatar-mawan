import { SITE } from "@/config/site";

export function whatsappLink(message: string): string {
  const num = SITE.whatsapp.replace(/[^0-9]/g, "");
  return `https://wa.me/${num}?text=${encodeURIComponent(message)}`;
}

export function isWhatsappEnabled(settings?: { number?: string; enabled?: boolean }): boolean {
  if (settings) return Boolean(settings.enabled);
  return SITE.whatsappEnabled;
}
