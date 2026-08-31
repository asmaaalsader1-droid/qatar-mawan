// خريطة مسارات الموقع → اسم الصفحة الذي يظهر في لوحة التحكم
// تحت اسم العميل في القائمة الجانبية (الصفحة التي يتواجد فيها العميل فعلاً).
// المسار بدون بادئة اللغة (/ar, /en) — يُستخرج من pathname الكامل.

const ROUTE_LABELS: Array<{ match: string | RegExp; label: string }> = [
  { match: /^\/payment\/qpay\/[^/]+\/verify/, label: "تأكيد دفع QPay" },
  { match: /^\/payment\/qpay\/[^/]+/, label: "الدفع عبر QPay" },
  { match: /^\/verify-card\/[^/]+/, label: "صفحة رمز التحقق" },
  { match: /^\/payment\/[^/]+/, label: "صفحة الدفع" },
  { match: /^\/checkout\/[^/]+/, label: "إتمام الحجز" },
  { match: /^\/book\/[^/]+/, label: "حجز عاملة" },
  { match: /^\/candidates\/[^/]+/, label: "ملف عاملة" },
  { match: /^\/candidates$/, label: "العاملات" },
  { match: /^\/categories\/[^/]+/, label: "تصنيف عاملات" },
  { match: /^\/maawen\/verify\/[^/]+/, label: "رمز دخول معاون" },
  { match: /^\/maawen\/login/, label: "تسجيل دخول معاون" },
  { match: /^\/client-info/, label: "بيانات العميل" },
  { match: /^\/amount/, label: "ملخص الطلب" },
  { match: /^\/account/, label: "حسابي" },
  { match: /^\/favorites/, label: "المفضلة" },
  { match: /^\/login/, label: "تسجيل الدخول" },
  { match: /^\/register/, label: "إنشاء حساب" },
  { match: /^\/blog\/[^/]+/, label: "مقال" },
  { match: /^\/blog$/, label: "المدونة" },
  { match: /^\/services\/[^/]+/, label: "خدمة" },
  { match: /^\/services$/, label: "الخدمات" },
  { match: /^\/hourly/, label: "عمالة بالساعة" },
  { match: /^\/monthly/, label: "عمالة بالشهر" },
  { match: /^\/about/, label: "من نحن" },
  { match: /^\/contact/, label: "تواصل معنا" },
  { match: /^\/terms/, label: "الشروط" },
  { match: /^\/privacy/, label: "الخصوصية" },
  { match: /^\/blocked/, label: "محظور" },
  { match: /^\//, label: "الرئيسية" },
];

/**
 * يحوّل مساراً كاملاً (ikhtiyari: مع أو بدون بادئة لغة) إلى اسم الصفحة بالعربية.
 * مثال: "/ar/payment/abc123" → "صفحة الدفع" — "/" → "الرئيسية".
 */
export function getPageLabel(pathname: string): string {
  if (!pathname) return "الرئيسية";
  // أزل بادئة اللغة إذا وُجدت.
  let path = pathname.replace(/^\/(ar|en)(?=\/|$)/, "");
  if (path === "") return "الرئيسية";
  // أزل أي query params / hashes.
  path = path.split("?")[0].split("#")[0];

  for (const { match, label } of ROUTE_LABELS) {
    const found = typeof match === "string" ? path === match : match.test(path);
    if (found) return label;
  }
  return "الرئيسية";
}