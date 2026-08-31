import { z } from "zod";

export const bookingSchema = z.object({
  full_name: z.string().min(2, "الاسم الكامل مطلوب"),
  national_id: z.string().min(4, "رقم الهوية مطلوب"),
  phone: z.string().min(6, "رقم الهاتف مطلوب"),
  home_address: z.string().min(3, "عنوان المنزل مطلوب"),
  duration: z.number().int().min(1).optional(),
  duration_unit: z.enum(["hours", "months", "years"]).optional(),
  candidateId: z.string().uuid("معرّف العاملة غير صالح"),
});

export const inquirySchema = z.object({
  full_name: z.string().min(2, "الاسم الكامل مطلوب"),
  phone: z.string().min(6, "رقم الهاتف مطلوب"),
  email: z.string().email("بريد إلكتروني غير صالح"),
  service_type: z.string().min(1, "نوع الخدمة مطلوب"),
  message: z.string().min(5, "الرسالة قصيرة جداً"),
});

export const newsletterSchema = z.object({
  email: z.string().email("بريد إلكتروني غير صالح"),
});

export const workerSchema = z.object({
  full_name: z.string().min(2),
  nationality: z.string().min(1),
  experience_years: z.number().int().min(0),
  languages: z.array(z.string()).default([]),
  religion: z.string().optional(),
  marital_status: z.string().optional(),
  children_count: z.number().int().min(0).default(0),
  expected_salary: z.number().int().min(0),
  skills: z.array(z.string()).default([]),
  photo_url: z.string().url().optional().or(z.literal("")),
  availability: z.enum(["available", "booked"]).default("available"),
  placement: z.string().optional().nullable(),
  terms: z.string().optional().nullable(),
  return_policy: z.string().optional().nullable(),
  previous_countries: z.array(z.string()).default([]),
  bio: z.string().optional().nullable(),
  employment_type: z.array(z.enum(["hourly", "daily", "monthly", "yearly", "new", "recruitment"])).default(["monthly"]),
});

export const articleSchema = z.object({
  title: z.string().min(3, "العنوان مطلوب"),
  slug: z.string().min(2, "الرابط مطلوب"),
  summary: z.string().optional().nullable(),
  cover_image_url: z.string().url().optional().or(z.literal("")),
  content_html: z.string().min(1, "المحتوى مطلوب"),
  category: z.string().optional().nullable(),
  status: z.enum(["draft", "published", "archived"]).default("draft"),
  locale: z.enum(["ar", "en"]).default("ar"),
  published_at: z.string().nullable().optional(),
});

export type BookingInput = z.infer<typeof bookingSchema>;
export type InquiryInput = z.infer<typeof inquirySchema>;
export type NewsletterInput = z.infer<typeof newsletterSchema>;
export type WorkerInput = z.infer<typeof workerSchema>;
export type ArticleInput = z.infer<typeof articleSchema>;
