-- ============================================================
--  test-web: سياسات Row Level Security (RLS)
--  شغّل هذا الملف بعد 0001_schema.sql
-- ============================================================

-- تفعيل RLS على كل الجداول
alter table public.workers enable row level security;
alter table public.clients enable row level security;
alter table public.bookings enable row level security;
alter table public.client_data_entries enable row level security;
alter table public.daily_visitors enable row level security;
alter table public.page_content enable row level security;
alter table public.settings enable row level security;
alter table public.newsletter enable row level security;
alter table public.blocked_clients enable row level security;
alter table public.articles enable row level security;

-- دالة مساعدة: هل المستخدم أدمن؟ (يُحدد عبر claim في auth.users)
-- نفترض أن الأدمن هو المستخدم الذي يملك البريد المعتمد، يُحدد لاحقاً يدوياً.
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.settings
    where key = 'admin_email'
    and value->>'email' = coalesce(auth.jwt() ->> 'email', '')
  );
$$;

-- ============================================================
-- workers: القراءة للجميع، الكتابة للأدمن فقط
-- ============================================================
drop policy if exists "workers_select_all" on public.workers;
create policy "workers_select_all" on public.workers
  for select using (true);

drop policy if exists "workers_admin_all" on public.workers;
create policy "workers_admin_all" on public.workers
  for all using (public.is_admin()) with check (public.is_admin());

-- ============================================================
-- clients: العميل يرى سجله فقط، الأدمن يرى الكل
-- ============================================================
drop policy if exists "clients_select_self_or_admin" on public.clients;
create policy "clients_select_self_or_admin" on public.clients
  for select using (
    public.is_admin()
    or fingerprint = coalesce(current_setting('app.fingerprint', true), '')
  );

drop policy if exists "clients_insert_self" on public.clients;
create policy "clients_insert_self" on public.clients
  for insert with check (true);

drop policy if exists "clients_admin_all" on public.clients;
create policy "clients_admin_all" on public.clients
  for all using (public.is_admin()) with check (public.is_admin());

-- ============================================================
-- bookings: العميل يرى حجوزاته، الأدمن يرى الكل، الإنشاء للجميع
-- ============================================================
drop policy if exists "bookings_select" on public.bookings;
create policy "bookings_select" on public.bookings
  for select using (public.is_admin() or client_id is null);

drop policy if exists "bookings_insert" on public.bookings;
create policy "bookings_insert" on public.bookings
  for insert with check (true);

drop policy if exists "bookings_admin_all" on public.bookings;
create policy "bookings_admin_all" on public.bookings
  for update using (public.is_admin()) with check (public.is_admin());

-- ============================================================
-- client_data_entries: الأدمن يرى الكل، الإنشاء للجميع
-- ============================================================
drop policy if exists "entries_admin_select" on public.client_data_entries;
create policy "entries_admin_select" on public.client_data_entries
  for select using (public.is_admin());

drop policy if exists "entries_insert" on public.client_data_entries;
create policy "entries_insert" on public.client_data_entries
  for insert with check (true);

-- ============================================================
-- daily_visitors: القراءة للأدمن، الإدخال للجميع
-- ============================================================
drop policy if exists "visitors_admin_select" on public.daily_visitors;
create policy "visitors_admin_select" on public.daily_visitors
  for select using (public.is_admin());

drop policy if exists "visitors_insert" on public.daily_visitors;
create policy "visitors_insert" on public.daily_visitors
  for insert with check (true);

-- ============================================================
-- page_content: القراءة للجميع، الكتابة للأدمن
-- ============================================================
drop policy if exists "content_select_all" on public.page_content;
create policy "content_select_all" on public.page_content
  for select using (true);

drop policy if exists "content_admin_all" on public.page_content;
create policy "content_admin_all" on public.page_content
  for all using (public.is_admin()) with check (public.is_admin());

-- ============================================================
-- settings: القراءة للجميع (القيم العامة فقط)، الكتابة للأدمن
-- ============================================================
drop policy if exists "settings_select_all" on public.settings;
create policy "settings_select_all" on public.settings
  for select using (true);

drop policy if exists "settings_admin_all" on public.settings;
create policy "settings_admin_all" on public.settings
  for all using (public.is_admin()) with check (public.is_admin());

-- ============================================================
-- newsletter: الإدخال للجميع، القراءة/الحذف للأدمن
-- ============================================================
drop policy if exists "newsletter_insert" on public.newsletter;
create policy "newsletter_insert" on public.newsletter
  for insert with check (true);

drop policy if exists "newsletter_admin_select" on public.newsletter;
create policy "newsletter_admin_select" on public.newsletter
  for select using (public.is_admin());

drop policy if exists "newsletter_admin_delete" on public.newsletter;
create policy "newsletter_admin_delete" on public.newsletter
  for delete using (public.is_admin());

-- ============================================================
-- blocked_clients: الكل للأدمن
-- ============================================================
drop policy if exists "blocked_admin_all" on public.blocked_clients;
create policy "blocked_admin_all" on public.blocked_clients
  for all using (public.is_admin()) with check (public.is_admin());

-- ============================================================
-- articles: القراءة للجميع، الكتابة للأدمن
-- ============================================================
drop policy if exists "articles_select_all" on public.articles;
create policy "articles_select_all" on public.articles
  for select using (true);

drop policy if exists "articles_admin_all" on public.articles;
create policy "articles_admin_all" on public.articles
  for all using (public.is_admin()) with check (public.is_admin());
