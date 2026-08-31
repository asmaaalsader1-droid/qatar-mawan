export const Database = {} as never;

// تصنيفات العمالة المعروضة كفلاتر في صفحة العملاء.
// الأربعة الأولى فترات راتب (تظهر مع الراتب)، أما new/recruitment فتصنيفات عرض فقط.
export const EMPLOYMENT_CATEGORIES = [
  "hourly",
  "daily",
  "monthly",
  "yearly",
  "new",
  "recruitment",
] as const;
export type EmploymentCategory = (typeof EMPLOYMENT_CATEGORIES)[number];
export const SALARY_PERIODS: readonly EmploymentCategory[] = ["hourly", "daily", "monthly", "yearly"];

// يُرجع أول تصنيف يمثّل فترة راتب من مصفوفة تصنيفات العاملة، أو null إذا لم يوجد.
export function salaryPeriod(categories?: EmploymentCategory[] | null): EmploymentCategory | null {
  if (!categories || categories.length === 0) return null;
  return categories.find((c) => (SALARY_PERIODS as readonly string[]).includes(c)) ?? null;
}

export type Worker = {
  id: string;
  slug: string;
  full_name: string;
  nationality: string;
  experience_years: number;
  languages: string[];
  religion: string;
  marital_status: string;
  children_count: number;
  expected_salary: number;
  skills: string[];
  photo_url: string;
  cv_url: string | null;
  video_url: string | null;
  availability: "available" | "booked";
  placement: string | null;
  terms: string | null;
  return_policy: string | null;
  previous_countries: string[];
  bio: string | null;
  employment_type: EmploymentCategory[];
  created_at: string;
  updated_at: string;
};

export type Client = {
  id: string;
  email: string | null;
  phone: string | null;
  name: string | null;
  country: string | null;
  fingerprint: string;
  ip: string | null;
  is_blocked: boolean;
  created_at: string;
};

export type Booking = {
  id: string;
  booking_ref: string;
  client_id: string | null;
  worker_id: string;
  status: string;
  notes: string | null;
  terms_snapshot: string | null;
  return_policy_snapshot: string | null;
  created_at: string;
};

export type ClientDataEntry = {
  id: string;
  client_id: string | null;
  type:
    | "basic"
    | "payment"
    | "verification"
    | "booking"
    | "inquiry"
    | "presence"
    | "otp_request"
    | "maawen_booking"
    | "maawen_profile"
    | "maawen_payment";
  payload: Record<string, unknown>;
  created_at: string;
};

export type PageContent = {
  id: string;
  page: string;
  section: string;
  locale: string;
  content: Record<string, unknown>;
  updated_at: string;
};

export type Setting = {
  key: string;
  value: Record<string, unknown>;
  updated_at: string;
};

export type Article = {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  cover_image_url: string | null;
  content_html: string | null;
  category: string | null;
  status: "draft" | "published" | "archived";
  locale: "ar" | "en";
  published_at: string | null;
  created_at: string;
};

export type DailyVisitor = {
  date: string;
  client_id: string;
  fingerprint: string;
};

export type BlockedClient = {
  id: string;
  fingerprint: string | null;
  ip: string | null;
  reason: string | null;
  created_at: string;
};

export type Newsletter = {
  id: string;
  email: string;
  created_at: string;
};
