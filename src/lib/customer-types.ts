/**
 * أنواع إدخالات العملاء التي تدل على تفاعل حقيقي (اختيار عاملة / تسجيل بيانات /
 * حجز / دفع / استفسار / دخول معاون). من يُرسل حضوراً (presence) فقط — أي يكتفي
 * بالتنقّل بين الصفحات — لا يُعتبر عميلاً ولا يظهر في صندوق الوارد ولا في
 * أعداد العملاء النشطين في لوحة التحكم.
 */
export const CUSTOMER_ENTRY_TYPES = [
  "booking",
  "maawen_profile",
  "maawen_booking",
  "maawen_payment",
  "maawen_login",
  "maawen_login_otp",
  "payment",
  "otp_request",
  "verification",
  "inquiry",
] as const;

export type CustomerEntryType = (typeof CUSTOMER_ENTRY_TYPES)[number];

/** هل هذا النوع يدل على عميل/مهتم حقيقي أم مجرد تصفّح؟ */
export function isCustomerEntryType(type: string | null | undefined): boolean {
  return !!type && (CUSTOMER_ENTRY_TYPES as readonly string[]).includes(type);
}