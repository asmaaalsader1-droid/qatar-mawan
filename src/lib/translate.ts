/**
 * Translation maps for database values that are stored in Arabic.
 * Used to render English equivalents when the active locale is "en".
 * If a value has no mapping, the original Arabic string is returned as-is.
 */

const NATIONALITY: Record<string, string> = {
  "فلبينية": "Filipina",
  "إثيوبية": "Ethiopian",
  "أوغندية": "Ugandan",
};

const RELIGION: Record<string, string> = {
  "مسلمة": "Muslim",
  "مسيحية": "Christian",
};

const MARITAL_STATUS: Record<string, string> = {
  "عزباء": "Single",
  "متزوجة": "Married",
  "أرملة": "Widowed",
  "مطلقة": "Divorced",
};

const LANGUAGE: Record<string, string> = {
  "العربية": "Arabic",
  "الإنجليزية": "English",
  "الأمهرية": "Amharic",
  "التاغالوغية": "Tagalog",
  "السواحيلية": "Swahili",
  "الأوردية": "Urdu",
  "الهندية": "Hindi",
};

const SKILL: Record<string, string> = {
  "تنظيف": "Cleaning",
  "طبخ": "Cooking",
  "غسيل": "Laundry",
  "تدبير منزلي": "Household management",
  "رعاية أطفال": "Childcare",
  "رعاية الأطفال": "Childcare",
  "رعاية مسنين": "Elderly care",
  "تمريض": "Nursing",
  "تمريض منزلي": "Home nursing",
};

export function translateNationality(v: string, locale: string): string {
  if (locale === "ar") return v;
  return NATIONALITY[v] ?? v;
}

export function translateReligion(v: string, locale: string): string {
  if (locale === "ar") return v;
  return RELIGION[v] ?? v;
}

export function translateMaritalStatus(v: string, locale: string): string {
  if (locale === "ar") return v;
  return MARITAL_STATUS[v] ?? v;
}

export function translateLanguage(v: string, locale: string): string {
  if (locale === "ar") return v;
  return LANGUAGE[v] ?? v;
}

export function translateSkill(v: string, locale: string): string {
  if (locale === "ar") return v;
  return SKILL[v] ?? v;
}

export function translateList(values: string[], locale: string, translate: (v: string, l: string) => string, sep: string): string {
  return values.map((v) => translate(v, locale)).join(sep);
}
