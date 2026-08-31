// أدوات اكتشاف معلومات العميل: الجهاز والدولة من الطلب

export type DeviceKind = "iphone" | "ipad" | "android" | "desktop";

export const DEVICE_LABELS: Record<DeviceKind, string> = {
  iphone: "آيفون",
  ipad: "آيباد",
  android: "أندرويد",
  desktop: "سطح المكتب",
};

export const DEVICE_ICONS: Record<DeviceKind, string> = {
  iphone: "📱",
  ipad: "📲",
  android: "🤖",
  desktop: "🖥️",
};

/** اكتشاف نوع الجهاز من User-Agent (موثوق من جهة الخادم). */
export function detectDevice(ua: string | null): DeviceKind {
  if (!ua) return "desktop";
  const u = ua.toLowerCase();
  if (u.includes("ipad")) return "ipad";
  if (u.includes("iphone") || u.includes("ipod")) return "iphone";
  if (u.includes("android")) return "android";
  return "desktop";
}

/** استخراج رمز الدولة (ISO 3166-1 alpha-2) من ترويسات الطلب. */
export function detectCountry(req: {
  headers: { get: (name: string) => string | null };
}): string | null {
  // ترويسات Vercel / Cloudflare / Supabase للحظر الجغرافي
  const headers = [
    "x-vercel-ip-country",
    "cf-ipcountry",
    "x-supabase-country",
    "x-country-code",
    "geoip-country-code",
  ];
  for (const h of headers) {
    const v = req.headers.get(h);
    if (v && v.length === 2) return v.toUpperCase();
  }
  // احتياط: حاول استخراج الدولة من Accept-Language
  const al = req.headers.get("accept-language");
  if (al) {
    const m = al.match(/\b([a-zA-Z]{2})-([A-Z]{2})/);
    if (m) return m[2].toUpperCase();
  }
  return null;
}

// ذاكرة مؤقتة لنتائج ipinfo.io: ip → { country, expiresAt }.
// تقلّل عدد الطلبات (الخطة المجانية محدودة) وتتحمّل فشل الشبكة بلارجوع للاحتمال الاحتياطي.
const IPINFO_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 ساعة
const ipinfoCache = new Map<string, { country: string | null; expiresAt: number }>();

/**
 * تحديد دولة العميل عبر ipinfo.io (endpoint /lite) باستخدام IP.
 * تُفضّل هذه الدالة على الترويسات لأنها دقيقة ومستقلة عن مزوّد الاستضافة
 * (Railway لا يُضيف ترويسات Geo افتراضياً).
 * - المفتاح سيرفر فقط (IPINFO_TOKEN) — لا يُكشف للواجهة.
 * - عند الفشل (شبكة/تجاوز حصة/لا مفتاح) تُعيد null ليرجع المُستدعي للاحتمال الاحتياطي.
 */
export async function lookupCountryByIp(ip: string): Promise<string | null> {
  if (!ip) return null;
  // عنوان خاص/محلي لا يُحدَّد عبر ipinfo
  if (ip === "127.0.0.1" || ip === "::1" || ip.startsWith("10.") || ip.startsWith("192.168.")) {
    return null;
  }

  const token = process.env.IPINFO_TOKEN;
  if (!token) return null;

  // اقرأ من الذاكرة المؤقتة إن كانت صالحة
  const cached = ipinfoCache.get(ip);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.country;
  }

  try {
    const res = await fetch(`https://api.ipinfo.io/lite/${encodeURIComponent(ip)}`, {
      headers: { Authorization: `Bearer ${token}` },
      // cache: 'no-store' لضمان أن fetch لا يُخزّن على مستوى Next/الـ runtime
      cache: "no-store",
    });
    if (!res.ok) {
      // خزّن null مؤقتاً لتجنّب إعادة المحاولة الفورية على نفس الـ IP الفاشل
      ipinfoCache.set(ip, { country: null, expiresAt: Date.now() + IPINFO_CACHE_TTL_MS });
      return null;
    }
    const data = (await res.json()) as { country_code?: string };
    const code = data.country_code ? String(data.country_code).toUpperCase().slice(0, 2) : null;
    ipinfoCache.set(ip, { country: code, expiresAt: Date.now() + IPINFO_CACHE_TTL_MS });
    return code;
  } catch {
    // فشل الشبكة → لا نخزّن (نُحاول مرة أخرى لاحقاً)، نُعيد null ليرجع المُستدعي للاحتمال الاحتياطي
    return null;
  }
}

/** تحويل رمز الدولة (alpha-2) إلى علم إيموجي. */
export function countryCodeToFlag(code: string | null): string {
  if (!code || code.length !== 2) return "🌐";
  const cc = code.toUpperCase();
  return String.fromCodePoint(
    ...Array.from(cc).map((c) => 0x1f1e6 + (c.charCodeAt(0) - 65)),
  );
}

/** أسماء الدول بالعربية لأشهر الرموز؛ ولغيرها يُعاد الرمز نفسه. */
const COUNTRY_NAMES_AR: Record<string, string> = {
  QA: "قطر", SA: "السعودية", AE: "الإمارات", KW: "الكويت", BH: "البحرين",
  OM: "عُمان", EG: "مصر", JO: "الأردن", PS: "فلسطين", LB: "لبنان",
  SY: "سوريا", IQ: "العراق", YE: "اليمن", SD: "السودان", LY: "ليبيا",
  TN: "تونس", DZ: "الجزائر", MA: "المغرب", MR: "موريتانيا", SO: "الصومال",
  DJ: "جيبوتي", KM: "جزر القمر",
  US: "الولايات المتحدة", GB: "المملكة المتحدة", FR: "فرنسا", DE: "ألمانيا",
  IT: "إيطاليا", ES: "إسبانيا", TR: "تركيا", IR: "إيران", IN: "الهند",
  PK: "باكستان", BD: "بنغلاديش", ID: "إندونيسيا", MY: "ماليزيا", PH: "الفلبين",
  ET: "إثيوبيا", KE: "كينيا", UG: "أوغندا", NG: "نيجيريا", GH: "غانا",
  CN: "الصين", JP: "اليابان", KR: "كوريا الجنوبية", RU: "روسيا", CA: "كندا",
  AU: "أستراليا", BR: "البرازيل", MX: "المكسيك", ZA: "جنوب أفريقيا",
};

export function countryNameAr(code: string | null): string | null {
  if (!code) return null;
  return COUNTRY_NAMES_AR[code.toUpperCase()] ?? code.toUpperCase();
}
