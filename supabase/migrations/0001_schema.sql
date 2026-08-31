-- ============================================================
--  test-web: المخطط الرئيسي (Supabase / PostgreSQL)
--  شغّل هذا الملف في Supabase SQL Editor
-- ============================================================

-- تمديدات ضرورية
create extension if not exists "pgcrypto";
create extension if not exists "uuid-ossp";

-- ------------------------------------------------------------
-- العاملات
-- ------------------------------------------------------------
create table if not exists public.workers (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  full_name text not null,
  nationality text not null,
  experience_years int not null default 0,
  languages text[] not null default '{}',
  religion text,
  marital_status text,
  children_count int not null default 0,
  expected_salary int not null default 0,
  skills text[] not null default '{}',
  photo_url text,
  cv_url text,
  video_url text,
  availability text not null default 'available',
  placement text,
  terms text,
  return_policy text,
  employment_type text not null default 'monthly',
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- العملاء
-- ------------------------------------------------------------
create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  phone text,
  name text,
  country text,
  fingerprint text unique not null,
  ip text,
  is_blocked boolean not null default false,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- الحجوزات/الطلبات
-- ------------------------------------------------------------
create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  booking_ref text unique not null,
  client_id uuid references public.clients(id) on delete set null,
  worker_id uuid references public.workers(id) on delete cascade,
  status text not null default 'pending',
  notes text,
  terms_snapshot text,
  return_policy_snapshot text,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- بيانات النماذج (صناديق ديناميكية)
-- ------------------------------------------------------------
create table if not exists public.client_data_entries (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients(id) on delete set null,
  type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- حضور الزوار
-- ------------------------------------------------------------
create table if not exists public.daily_visitors (
  date date not null default current_date,
  client_id uuid references public.clients(id) on delete cascade,
  fingerprint text not null,
  unique(date, client_id)
);
create index if not exists idx_daily_visitors_date on public.daily_visitors(date);

-- ------------------------------------------------------------
-- محتوى الصفحات (CMS)
-- ------------------------------------------------------------
create table if not exists public.page_content (
  id uuid primary key default gen_random_uuid(),
  page text not null,
  section text not null,
  locale text not null default 'ar',
  content jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  unique(page, section, locale)
);

-- ------------------------------------------------------------
-- الإعدادات (يديرها المدير)
-- ------------------------------------------------------------
create table if not exists public.settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- النشرة البريدية
-- ------------------------------------------------------------
create table if not exists public.newsletter (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- حظر IP/بصمة
-- ------------------------------------------------------------
create table if not exists public.blocked_clients (
  id uuid primary key default gen_random_uuid(),
  fingerprint text,
  ip text,
  reason text,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- المدونة (مقالات CMS)
-- ------------------------------------------------------------
create table if not exists public.articles (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  summary text,
  cover_image_url text,
  content_html text not null default '',
  category text,
  status text not null default 'draft',  -- draft | published | archived
  locale text not null default 'ar',
  published_at timestamptz,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- تفعيل Realtime على كل الجداول
-- ------------------------------------------------------------
alter publication supabase_realtime add table public.workers;
alter publication supabase_realtime add table public.bookings;
alter publication supabase_realtime add table public.client_data_entries;
alter publication supabase_realtime add table public.page_content;
alter publication supabase_realtime add table public.settings;
alter publication supabase_realtime add table public.daily_visitors;
alter publication supabase_realtime add table public.blocked_clients;
alter publication supabase_realtime add table public.articles;
