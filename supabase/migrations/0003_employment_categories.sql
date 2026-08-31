-- 0003: تحويل workers.employment_type من قيمة واحدة (text) إلى مصفوفة (text[])
-- يسمح بانتماء العاملة لأكثر من تصنيف (بالساعة + باليوم مثلاً) ليظهر في عدة فلاتر
-- دون تكرار خاطئ. القيم المسموحة: hourly, daily, monthly, yearly, new, recruitment.
-- ملاحظة: يُطبَّق يدوياً عبر Supabase Dashboard SQL Editor.

-- 1) حذف القيمة الافتراضية القديمة (نص مفرد مثل 'monthly') قبل تحويل النوع،
--    وإلا فشل التحويل: "default ... cannot be cast automatically to type text[]".
alter table public.workers
  alter column employment_type drop default;

-- 2) تحويل العمود إلى مصفوفة مع الإبقاء على القيم الحالية كعنصر واحد داخل المصفوفة.
alter table public.workers
  alter column employment_type drop not null,
  alter column employment_type type text[] using array[employment_type];

-- 3) تعيين افتراضي فارغ: العاملة الجديدة تأخذ تصنيفها من لوحة التحكم.
alter table public.workers
  alter column employment_type set default '{}';
