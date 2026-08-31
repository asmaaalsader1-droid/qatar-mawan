import type { Worker, EmploymentCategory } from "@/lib/supabase/types";
import { salaryPeriod } from "@/lib/supabase/types";
import { formatSalary } from "@/lib/utils";

/**
 * نظام التسعير الموحّد حسب نوع التوظيف.
 * الأسعار ثابتة لكل فئة ولا تعتمد على expected_salary المخزّن للعاملة.
 */
export const PRICING = {
  hourly: { amount: 50, unit: "hour" as const },
  monthly: { amount: 950, unit: "month" as const },
  yearly: { amount: 15000, unit: "year" as const },
  // الاستقدام: رسوم لمرة واحدة + راتب شهري ثابت للعاملة.
  recruitment: { amount: 8000, monthlySalary: 850 },
} as const;

export type WorkerPrice = {
  /** فئة التسعير المطبّقة على العاملة */
  category: "hourly" | "monthly" | "yearly" | "recruitment";
  /** المبلغ الأساسي (بالريال القطري) */
  amount: number;
  /** وحدة الفترة: ساعة / شهر / سنة */
  unit: "hour" | "month" | "year" | "once";
  /** الراتب الشهري للعاملة (للاستقدام فقط) */
  monthlySalary?: number;
};

/**
 * يُرجع سعر العاملة بناءً على نوع توظيفها.
 * الأولوية للاستقدام إن وُجد ضمن التصنيفات، وإلا لأول فترة راتب.
 */
export function getWorkerPrice(worker: Pick<Worker, "employment_type"> | null | undefined): WorkerPrice | null {
  const cats = worker?.employment_type ?? [];
  if (cats.includes("recruitment")) {
    return {
      category: "recruitment",
      amount: PRICING.recruitment.amount,
      unit: "once",
      monthlySalary: PRICING.recruitment.monthlySalary,
    };
  }
  const period = salaryPeriod(cats);
  if (period === "hourly") return { category: "hourly", amount: PRICING.hourly.amount, unit: "hour" };
  if (period === "monthly") return { category: "monthly", amount: PRICING.monthly.amount, unit: "month" };
  if (period === "yearly") return { category: "yearly", amount: PRICING.yearly.amount, unit: "year" };
  return null;
}

const UNIT_AR: Record<WorkerPrice["unit"], string> = {
  hour: "ساعة",
  month: "شهر",
  year: "سنة",
  once: "مرة واحدة",
};
const UNIT_EN: Record<WorkerPrice["unit"], string> = {
  hour: "hour",
  month: "month",
  year: "year",
  once: "once",
};

/**
 * نصّ عربي/إنجليزي لسعر العاملة يُعرض على البطاقات وصفحة التفاصيل.
 * مثال: "50 ر.ق / ساعة" أو "8,000 ر.ق استقدام (+ 850 ر.ق/شهر)".
 */
export function formatWorkerPrice(worker: Pick<Worker, "employment_type">, locale = "ar"): string {
  const price = getWorkerPrice(worker);
  if (!price) {
    // لا فترة راتب محدّدة (daily / new فقط) — لا سعر موحّد.
    return locale === "ar" ? "السعر عند الاستفسار" : "Price on inquiry";
  }
  const unitLabel = locale === "ar" ? UNIT_AR[price.unit] : UNIT_EN[price.unit];
  if (price.category === "recruitment") {
    const placement = formatSalary(price.amount, locale);
    const salary = formatSalary(price.monthlySalary ?? 0, locale);
    return locale === "ar"
      ? `${placement} استقدام (+ ${salary}/شهر)`
      : `${placement} placement (+ ${salary}/mo)`;
  }
  return `${formatSalary(price.amount, locale)} / ${unitLabel}`;
}

/**
 * يحسب المبلغ الإجمالي المطلوب دفعه لحجز عاملة معيّنة.
 * @param worker العاملة
 * @param duration عدد الوحدات (ساعات/شهور/سنوات) إن وُجد في حمولة الحجز
 * @param durationUnit وحدة المدة المخزّنة في الحجز
 */
export function computeBookingAmount(
  worker: Pick<Worker, "employment_type" | "expected_salary"> | null | undefined,
  duration?: number,
  durationUnit?: "hours" | "months" | "years",
): number {
  const price = getWorkerPrice(worker);
  if (price) {
    if (price.category === "recruitment") return price.amount;
    if (duration && duration > 0) {
      return price.amount * duration;
    }
    return price.amount;
  }
  // احتياطي للعاملات بلا فترة راتب موحّدة (daily/new).
  return worker?.expected_salary ?? 0;
}
