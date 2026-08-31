export function formatSalary(amount: number, locale = "ar", currency?: string): string {
  const cur = currency ?? (locale === "ar" ? "ر.ق" : "QAR");
  const formatted = new Intl.NumberFormat(locale === "ar" ? "ar-EG" : "en-US").format(amount);
  return `${formatted} ${cur}`;
}

export function slugify(text: string): string {
  return text
    .toString()
    .normalize("NFKD")
    .toLowerCase()
    .trim()
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function generateBookingRef(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `BK-${ts}-${rand}`;
}

export function timeAgoArabic(dateStr: string, locale = "ar"): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const sec = Math.floor(diff / 1000);
  const min = Math.floor(sec / 60);
  const hr = Math.floor(min / 60);
  const day = Math.floor(hr / 24);
  if (locale === "ar") {
    if (sec < 60) return `منذ ${sec} ثانية`;
    if (min < 60) return `منذ ${min} دقيقة`;
    if (hr < 24) return `منذ ${hr} ساعة`;
    return `منذ ${day} يوم`;
  }
  if (sec < 60) return `${sec}s ago`;
  if (min < 60) return `${min}m ago`;
  if (hr < 24) return `${hr}h ago`;
  return `${day}d ago`;
}
