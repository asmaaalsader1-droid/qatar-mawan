import type { Worker, EmploymentCategory } from "@/lib/supabase/types";
import { salaryPeriod } from "@/lib/supabase/types";

/**
 * الشروط وسياسة الاسترجاع الافتراضية حسب نوع توظيف العاملة.
 * تُستخدم كاحتياطي حين لا يحدّد المدير شروطاً خاصة (worker.terms / worker.return_policy فارغة).
 * بهذا تبقى الشروط متكيّفة مع نوع العاملة تلقائياً، ويستطيع المدير تجاوزها متى شاء.
 */

const BASE_TERMS_AR =
  "يلتزم صاحب العمل بدفع الراتب المتفق عليه بانتظام، مع توفير سكن ملائم، طعام صحي، ورعاية طبية كاملة للعاملة. تلتزم العاملة بأداء المهام المنزلية بأمانة وإخلاص، مع احترام خصوصية المنزل والمحافظة على ممتلكاته وعادات المجتمع.";

const BASE_TERMS_EN =
  "The employer undertakes to pay the agreed salary regularly, and to provide suitable accommodation, healthy food, and full medical care for the worker. The worker commits to performing household duties honestly and faithfully, while respecting the privacy of the home and preserving its property and community customs.";

const BASE_RETURN_AR =
  "يحق لصاحب العمل استبدال العاملة بعاملة أخرى، ويتم الاستبدال في نفس اليوم ولا يتجاوز مدة أقصاها 8 ساعات لسرعة الاستبدال.";

const BASE_RETURN_EN =
  "The employer is entitled to replace the worker with another; replacement is done the same day and takes no longer than 8 hours to expedite the process.";

/** يُرجع نوع التوظيف الأساسي المحدِّد لفترة التجربة (الأسبقية: استقدام > سنوي > شهري > يومي/ساعي). */
export function primaryEmployment(cats: EmploymentCategory[] | null | undefined): EmploymentCategory | null {
  const list = cats ?? [];
  if (list.includes("recruitment")) return "recruitment";
  if (list.includes("yearly")) return "yearly";
  if (list.includes("monthly")) return "monthly";
  if (list.includes("daily")) return "daily";
  if (list.includes("hourly")) return "hourly";
  if (list.includes("new")) return "new";
  return salaryPeriod(list);
}

/** نص الراتب المتفق عليه بحسب نوع العاملة. */
function salaryClauseAr(cat: EmploymentCategory | null): string {
  switch (cat) {
    case "hourly":
      return "الراتب بالساعة (50 ريال قطري لكل ساعة) يدفع بعد كل فترة عمل";
    case "daily":
      return "الأجر اليومي يُدفع في نهاية كل يوم عمل";
    case "monthly":
      return "الراتب الشهري المتفق عليه (950 ريال قطري شهرياً)";
    case "yearly":
      return "الراتب السنوي المتفق عليه (15,000 ريال قطري سنوياً)";
    case "recruitment":
      return "راتب شهري للعاملة بقيمة 850 ريال قطري شهرياً بعد دفع رسوم الاستقدام";
    default:
      return "الراتب المتفق عليه";
  }
}

function salaryClauseEn(cat: EmploymentCategory | null): string {
  switch (cat) {
    case "hourly":
      return "Hourly wage (50 QAR per hour), paid after each work period";
    case "daily":
      return "Daily wage, paid at the end of each working day";
    case "monthly":
      return "The agreed monthly salary (950 QAR per month)";
    case "yearly":
      return "The agreed yearly salary (15,000 QAR per year)";
    case "recruitment":
      return "Monthly worker salary of 850 QAR per month after paying the placement fee";
    default:
      return "The agreed salary";
  }
}

/** مدة الاستراحة/فترة التجربة بحسب نوع العاملة. */
function trialClauseAr(cat: EmploymentCategory | null): string {
  switch (cat) {
    case "hourly":
      return "لا توجد فترة تجربة للعاملة بالساعة؛ يوجد استبدال فوري في حال عدم التزام العاملة بالأداء الممتاز والمتوقع";
    case "daily":
      return "لا توجد فترة تجربة؛ الاستبدال فوري عند عدم الالتزام";
    case "monthly":
      return "فترة التجربة 7 أيام";
    case "yearly":
      return "فترة التجربة شهر واحد";
    case "recruitment":
      return "فترة التجربة 3 شهور";
    default:
      return "فترة التجربة حسب العقد";
  }
}

function trialClauseEn(cat: EmploymentCategory | null): string {
  switch (cat) {
    case "hourly":
      return "No probation period for hourly workers; instant replacement if performance falls short";
    case "daily":
      return "No probation; instant replacement if commitments are not met";
    case "monthly":
      return "Probation period: 7 days";
    case "yearly":
      return "Probation period: 1 month";
    case "recruitment":
      return "Probation period: 3 months";
    default:
      return "Probation as per contract";
  }
}

/** الشروط الافتراضية للعاملة حسب نوع توظيفها (راتب + التزامات + فترة تجربة). */
export function defaultTerms(worker: Pick<Worker, "employment_type">, locale = "ar"): string {
  const cat = primaryEmployment(worker.employment_type);
  if (locale === "en") {
    return `${BASE_TERMS_EN}\n\n${salaryClauseEn(cat)}.\n${trialClauseEn(cat)}.`;
  }
  return `${BASE_TERMS_AR}\n\n${salaryClauseAr(cat)}.\n${trialClauseAr(cat)}.`;
}

/** سياسة الاسترجاع/الاستبدال الافتراضية مع فترة التجربة بحسب نوع العاملة. */
export function defaultReturnPolicy(worker: Pick<Worker, "employment_type">, locale = "ar"): string {
  const cat = primaryEmployment(worker.employment_type);
  const trial = locale === "ar" ? trialClauseAr(cat) : trialClauseEn(cat);
  if (locale === "en") {
    return `${BASE_RETURN_EN}\n${trial}.`;
  }
  return `${BASE_RETURN_AR}\n${trial}.`;
}
