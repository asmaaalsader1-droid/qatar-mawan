-- 0004_worker_details.sql
-- إضافة أعمدة التفاصيل للعاملات: الدول السابقة + نبذة تعريفية.
-- تُشغَّل يدوياً في Supabase Dashboard → SQL Editor.

alter table public.workers
  add column if not exists previous_countries text[] not null default '{}';

alter table public.workers
  add column if not exists bio text;

-- 0005: updated_at للعاملات — يُستخدم لإبطال cache الصور عند تعديل المدير.
alter table public.workers
  add column if not exists updated_at timestamptz not null default now();

create or replace function public.touch_workers_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists workers_updated_at on public.workers;
create trigger workers_updated_at
  before update on public.workers
  for each row execute function public.touch_workers_updated_at();

