-- يسمح لـ Supabase Realtime بنشر عمليات DELETE على daily_visitors.
-- بدون ذلك يمنع PostgreSQL حذف أي صف من الجدول عندما يكون منشورًا في Realtime.
alter table public.daily_visitors replica identity full;
