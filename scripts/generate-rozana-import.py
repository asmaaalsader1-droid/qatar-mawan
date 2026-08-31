#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
يولّد سكربت SQL (scripts/import-rozana-workers.sql) لإدراج 321 عاملة من ملفات
rozana-candidate-image-links.{txt,html} في جدول public.workers.

التشغيل:
    python3 scripts/generate-rozana-import.py

الناتج:
    scripts/import-rozana-workers.sql  (يشغَّل يدوياً في Supabase Dashboard SQL Editor)

ملاحظات:
- الجنسيات تُحفظ بالعربية في قاعدة البيانات (Ethiopian→إثيوبية ...).
- توزيع تصنيفات العمالة متنوّع ومُحدَّد سلفاً (لا عشوائية) لإظهار كل الفلاتر:
    {hourly}×48, {daily}×48, {monthly}×80, {yearly}×40,
    {new}×30, {recruitment}×55, {new,monthly}×10, {new,hourly}×10  (المجموع 321).
  العاملات متعددة التصنيف تظهر تحت أكثر من فلتر (إظهار لميزة المصفوفة).
- الملف لا يحتوي على «نوع العاملة»، لذا التوزيع أعلاه هو الافتراض؛ يمكن للمدير
  تعديل تصنيفات كل عاملة لاحقاً من لوحة التحكم.
- الصور روابط خارجية مباشرة؛ الـ31 عاملة بلا صورة تُترك photo_url=null
  فيُولّد المكوّن CandidateImage صورة رمزية تلقائياً.
- السكربت آمن لإعادة التشغيل: يحوّل employment_type إلى مصفوفة إن لم يكن،
  ثم يحذف العاملات الوهمية التجريبية، ثم يُدرج على دفعات مع on conflict do nothing.
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TXT = ROOT / "rozana-candidate-image-links.txt"
OUT = ROOT / "scripts" / "import-rozana-workers.sql"

NAT_MAP = {
    "Ethiopian": "إثيوبية",
    "Ugandan": "أوغندية",
    "Filipino": "فلبينية",
}

# توزيع تصنيفات العمالة على الـ321 عاملة (مُحدَّد سلفاً، قابل للمراجعة).
# ترتيب Interleaved لضمان انتشار متساوٍ عبر القائمة بدل تجميعها.
CATEGORY_PLAN: list[list[str]] = (
    [["monthly"]] * 80
    + [["recruitment"]] * 55
    + [["hourly"]] * 48
    + [["daily"]] * 48
    + [["yearly"]] * 40
    + [["new"]] * 30
    + [["new", "monthly"]] * 10
    + [["new", "hourly"]] * 10
)
# مجموع الفئات = 321. يُخالَط الترتيب (shuffle ثابت عبر seed) لتفادي التجمع.



def parse(path: Path):
    text = path.read_text(encoding="utf-8")
    pattern = re.compile(
        r"^(\d{3})\s*\|\s*(.+?)\s*\|\s*(\w+)\s*\|\s*(\S*)\s*\|\s*(\S+)\s*$",
        re.MULTILINE,
    )
    rows = []
    for num, name, nat, image, profile in pattern.findall(text):
        name = re.sub(r"\s+", " ", name).strip()
        nat = NAT_MAP.get(nat, nat)
        image = image.strip() or None
        rows.append({"num": num, "name": name, "nat": nat, "image": image, "profile": profile.strip()})
    return rows


def slugify(name: str) -> str:
    s = name.lower().strip()
    s = re.sub(r"[^\w\s-]", "", s, flags=re.UNICODE)
    s = re.sub(r"[\s_-]+", "-", s)
    s = re.sub(r"^-+|-+$", "", s)
    return s


def sql_escape(value: str) -> str:
    return value.replace("'", "''")


def array_literal(cats: list[str]) -> str:
    """يحوّل قائمة تصنيفات إلى صيغة مصفوفة Postgres: {hourly,monthly} → '{hourly,monthly}'."""
    inner = ",".join(cats)
    return "'{" + inner + "}'"


def interleave(plan: list[list[str]], total: int) -> list[list[str]]:
    """يُخالِط خطة التصنيفات بشكل ثابت (seed) ليُوزّع كل تصنيف عبر القائمة بالتساوي."""
    import random

    rng = random.Random(42)
    indexed = list(range(len(plan)))
    rng.shuffle(indexed)
    shuffled = [plan[i] for i in indexed]
    # كرّر إن لزم لتغطية العدد الكلي
    while len(shuffled) < total:
        shuffled += shuffled
    return shuffled[:total]


def main() -> int:
    if not TXT.exists():
        print(f"خطأ: الملف غير موجود: {TXT}", file=sys.stderr)
        return 1

    rows = parse(TXT)
    print(f"تم تحليل {len(rows)} عاملة.")

    # التأكد من عدم تكرار الـ slug (إضافة رقم التسلسل يضمن التفرّد).
    seen = set()
    for r in rows:
        base = slugify(r["name"]) or f"rozana-{r['num']}"
        slug = f"{base}-{r['num']}"
        if slug in seen:
            slug = f"{base}-{r['num']}-{r['profile'].split('/')[-1]}"
        seen.add(slug)
        r["slug"] = slug

    # توزيع تصنيفات العمالة بشكل متنوّع ومُخالَط ثابت (قابل للمراجعة).
    if len(CATEGORY_PLAN) != len(rows):
        print(f"تحذير: حجم خطة التصنيفات ({len(CATEGORY_PLAN)}) لا يساوي عدد العاملات ({len(rows)}).", file=sys.stderr)
    cats_seq = interleave(CATEGORY_PLAN, len(rows))
    for r, cats in zip(rows, cats_seq):
        r["cats"] = cats

    # تقرير توزيع الفلاتر (عدد العاملات تحت كل فلتر، بما في ذلك المتعددة).
    from collections import Counter

    filter_counts = Counter()
    for r in rows:
        for c in r["cats"]:
            filter_counts[c] += 1
    print("عدد العاملات تحت كل فلتر (المتعددة تُحتسب في كل تصنيف):")
    for c in ["hourly", "daily", "monthly", "yearly", "new", "recruitment"]:
        print(f"  {c}: {filter_counts[c]}")
    multi = sum(1 for r in rows if len(r["cats"]) > 1)
    print(f"عاملات متعددة التصنيف: {multi}")

    lines = []
    lines.append("-- ============================================================")
    lines.append("-- استيراد عاملات روزانا (321 عاملة) إلى public.workers")
    lines.append("-- مُولّد آلياً بواسطة scripts/generate-rozana-import.py")
    lines.append("-- يُشغَّل يدوياً في Supabase Dashboard → SQL Editor.")
    lines.append("-- آمن لإعادة التشغيل (idempotent).")
    lines.append("-- ============================================================")
    lines.append("")
    lines.append("-- 1) ضمان أن employment_type مصفوفة text[] (migration 0003 مكافئ).")
    lines.append("--    يتجاهل التحويل إن كان العمود أصلاً مصفوفة.")
    lines.append("do $$")
    lines.append("begin")
    lines.append("  if exists (")
    lines.append("    select 1 from information_schema.columns")
    lines.append("    where table_schema = 'public' and table_name = 'workers'")
    lines.append("      and column_name = 'employment_type' and udt_name = 'text'")
    lines.append("  ) then")
    lines.append("    alter table public.workers alter column employment_type drop default;")
    lines.append("    alter table public.workers alter column employment_type drop not null;")
    lines.append("    alter table public.workers")
    lines.append("      alter column employment_type type text[] using array[employment_type];")
    lines.append("    alter table public.workers alter column employment_type set default '{}';")
    lines.append("  end if;")
    lines.append("end $$;")
    lines.append("")
    lines.append("-- 2) حذف العاملات الوهمية التجريبية الحالية.")
    lines.append("--    bookings مرتبطة بـ worker_id مع on delete cascade فتُحذف تلقائياً.")
    lines.append("delete from public.workers;")
    lines.append("")
    lines.append("-- 3) إدراج عاملات روزانا على دفعات (50 صف لكل إدراج) لتفادي حدود الجلسة.")
    lines.append("--    on conflict (slug) do nothing → إعادة التشغيل آمنة.")

    BATCH = 50
    cols = (
        "slug, full_name, nationality, experience_years, languages, religion, "
        "marital_status, children_count, expected_salary, skills, photo_url, "
        "availability, employment_type, terms, return_policy"
    )
    total_inserted = 0
    for i in range(0, len(rows), BATCH):
        batch = rows[i : i + BATCH]
        lines.append("")
        lines.append(f"-- الدفعة {i // BATCH + 1}: الصفوف {batch[0]['num']}–{batch[-1]['num']}")
        lines.append(f"insert into public.workers ({cols}) values")
        value_lines = []
        for r in batch:
            photo = f"'{sql_escape(r['image'])}'" if r["image"] else "null"
            cats = array_literal(r["cats"])
            value_lines.append(
                "  ("
                f"'{sql_escape(r['slug'])}', "          # slug
                f"'{sql_escape(r['name'])}', "          # full_name
                f"'{sql_escape(r['nat'])}', "           # nationality
                "0, "                                   # experience_years
                "'{}', "                                # languages
                "null, "                                # religion
                "null, "                                # marital_status
                "0, "                                   # children_count
                "0, "                                   # expected_salary
                "'{}', "                                # skills
                f"{photo}, "                            # photo_url
                "'available', "                         # availability
                f"{cats}, "                             # employment_type
                "null, "                                # terms
                "null"                                  # return_policy
                + ")"
            )
        lines.append(",\n".join(value_lines))
        lines.append("on conflict (slug) do nothing;")
        total_inserted += len(batch)

    lines.append("")
    lines.append("-- 4) التحقق من العدد النهائي.")
    lines.append("select count(*) as total_workers from public.workers;")
    lines.append("")

    OUT.write_text("\n".join(lines), encoding="utf-8")
    print(f"تم توليد {OUT.relative_to(ROOT)}")
    print(f"صفوف مُدرجة متوقعة: {total_inserted}")
    print(f"حجم الملف: {OUT.stat().st_size} بايت")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
