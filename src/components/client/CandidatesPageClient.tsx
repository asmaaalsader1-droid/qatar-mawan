"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Dictionary } from "@/lib/i18n";
import { Worker } from "@/lib/supabase/types";
import { CandidateCard } from "@/components/client/CandidateCard";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";
import { Button } from "@/components/ui/Button";
import { GridIcon, ListIcon, FilterIcon, CloseIcon } from "@/components/ui/Icons";
import { EmploymentCategory } from "@/lib/supabase/types";
import styles from "./CandidatesPageClient.module.css";

const NATIONALITIES_AR = ["all", "فلبينية", "إثيوبية", "أوغندية"];
const NATIONALITIES_EN = ["all", "Filipina", "Ethiopian", "Ugandan"];
// DB stores nationalities in Arabic; map English display labels back to DB values.
const NATIONALITY_DB: Record<string, string> = {
  "فلبينية": "فلبينية",
  "إثيوبية": "إثيوبية",
  "أوغندية": "أوغندية",
  "Filipina": "فلبينية",
  "Ethiopian": "إثيوبية",
  "Ugandan": "أوغندية",
};
// Languages & religions are stored in Arabic in the DB. Display labels per locale;
// the display value is mapped back to the DB value when updating the URL filter.
const LANGUAGES_AR = ["all", "العربية", "الإنجليزية", "الأمهرية", "التاغالوغية", "السواحيلية"];
const LANGUAGES_EN = ["all", "Arabic", "English", "Amharic", "Tagalog", "Swahili"];
const LANGUAGE_DB: Record<string, string> = {
  "العربية": "العربية", "الإنجليزية": "الإنجليزية", "الأمهرية": "الأمهرية",
  "التاغالوغية": "التاغالوغية", "السواحيلية": "السواحيلية",
  "Arabic": "العربية", "English": "الإنجليزية", "Amharic": "الأمهرية",
  "Tagalog": "التاغالوغية", "Swahili": "السواحيلية",
};
const RELIGIONS_AR = ["all", "مسلمة", "مسيحية"];
const RELIGIONS_EN = ["all", "Muslim", "Christian"];
const RELIGION_DB: Record<string, string> = {
  "مسلمة": "مسلمة", "مسيحية": "مسيحية",
  "Muslim": "مسلمة", "Christian": "مسيحية",
};
const AVAILABILITY = ["all", "available", "booked"];

// تصنيفات العمالة المستخدمة كفلاتر. القيم مخزّنة في قاعدة البيانات داخل
// مصفوفة employment_type. المعرّفات الإنجليزية هي القيم الفعلية المخزّنة.
const EMPLOYMENT_FILTER: EmploymentCategory[] = [
  "hourly",
  "daily",
  "monthly",
  "yearly",
  "new",
  "recruitment",
];

export function CandidatesPageClient({
  dict,
  locale,
  initial,
}: {
  dict: Dictionary;
  locale: string;
  initial: Worker[];
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const isAr = locale === "ar";
  const nationalities = isAr ? NATIONALITIES_AR : NATIONALITIES_EN;
  const languages = isAr ? LANGUAGES_AR : LANGUAGES_EN;
  const religions = isAr ? RELIGIONS_AR : RELIGIONS_EN;
  const [workers, setWorkers] = useState<Worker[]>(initial);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(initial.length);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const firstRender = useRef(true);

  const q = searchParams.get("q") || "";
  const nationality = searchParams.get("nationality") || "all";
  const language = searchParams.get("language") || "all";
  const religion = searchParams.get("religion") || "all";
  const availability = searchParams.get("availability") || "all";
  const employment = searchParams.get("employment") || "all";
  const sort = searchParams.get("sort") || "recommended";
  const view = (searchParams.get("view") as "grid" | "list") || "grid";

  useEffect(() => {
    // الصفحة تأتي ببياناتها الأولى من الخادم؛ لا نكرر نفس طلب API عند أول عرض
    // إذا لم توجد فلاتر. عند وجود query filter يجب جلب النتائج المطابقة.
    if (firstRender.current) {
      firstRender.current = false;
      const onlyServerFilter = Boolean(!q && nationality === "all" && language === "all" && religion === "all" && availability === "all" && employment !== "all" && sort === "recommended");
      const hasQueryFilter = Boolean(q || nationality !== "all" || language !== "all" || religion !== "all" || availability !== "all" || employment !== "all" || sort !== "recommended");
      if (!hasQueryFilter || onlyServerFilter) return;
    }
    const timer = setTimeout(() => fetchWorkers(1, true), 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, nationality, language, religion, availability, employment, sort]);

  async function fetchWorkers(p: number, reset: boolean) {
    setLoading(true);
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (nationality !== "all") params.set("nationality", nationality);
    if (language !== "all") params.set("language", language);
    if (religion !== "all") params.set("religion", religion);
    if (availability !== "all") params.set("availability", availability);
    if (employment !== "all") params.set("employment", employment);
    if (sort) params.set("sort", sort);
    params.set("page", String(p));
    params.set("pageSize", "12");

    const res = await fetch(`/api/candidates?${params.toString()}`);
    const data = await res.json();
    if (reset) {
      setWorkers(data.items);
    } else {
      setWorkers((prev) => [...prev, ...data.items]);
    }
    setTotal(data.total);
    setPage(p);
    setLoading(false);
  }

  // Per-filter display→DB maps so URL always stores the DB (Arabic) value,
  // while chips show the visitor's locale. "all" stays as "all".
  const DB_MAPS: Record<string, Record<string, string>> = {
    nationality: NATIONALITY_DB,
    language: LANGUAGE_DB,
    religion: RELIGION_DB,
  };

  // أزرار اختيار سريع لفئات العمالة — تُظهر للعميل مباشرة فوق قائمة العاملات
  // حتى لا يحتاج لاستخدام الفلتر. النقر يوجّه إلى ?employment=<cat> فيُفلتر تلقائياً.
  const QUICK_CATS: EmploymentCategory[] = ["hourly", "daily", "monthly", "yearly", "recruitment"];
  const CAT_LABELS: Record<string, string> = {
    all: dict.candidates.catAll,
    hourly: dict.candidates.catHourly,
    daily: dict.candidates.catDaily,
    monthly: dict.candidates.catMonthly,
    yearly: dict.candidates.catYearly,
    recruitment: dict.candidates.catRecruitment,
  };

  function dbValue(key: string, displayValue: string): string {
    const m = DB_MAPS[key];
    return m ? m[displayValue] ?? displayValue : displayValue;
  }

  function updateParam(key: string, value: string) {
    const next = new URLSearchParams(searchParams);
    const db = dbValue(key, value);
    if (db && db !== "all" && db !== "") next.set(key, db);
    else next.delete(key);
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  }

  // A chip is active when its display value resolves to the same DB value
  // currently stored in the URL (which is always a DB value).
  function isActive(key: string, paramValue: string, chipLabel: string): boolean {
    if (paramValue === "all" || chipLabel === "all") return paramValue === chipLabel;
    return dbValue(key, chipLabel) === paramValue;
  }

  function resetAll() {
    router.replace(`${pathname}`, { scroll: false });
  }

  const hasMore = workers.length < total;

  const Filters = (
    <div className={styles.filters}>
      <div className={styles.filterGroup}>
        <span className={styles.filterLabel}>{dict.candidates.nationality}</span>
        <div className={styles.chips}>
          {nationalities.map((n) => (
            <button
              key={n}
              className={`${styles.chip} ${isActive("nationality", nationality, n) ? styles.chipActive : ""}`}
              onClick={() => updateParam("nationality", n)}
            >
              {n === "all" ? dict.candidates.all : n}
            </button>
          ))}
        </div>
      </div>
      <div className={styles.filterGroup}>
        <span className={styles.filterLabel}>{dict.candidates.language}</span>
        <div className={styles.chips}>
          {languages.map((l) => (
            <button
              key={l}
              className={`${styles.chip} ${isActive("language", language, l) ? styles.chipActive : ""}`}
              onClick={() => updateParam("language", l)}
            >
              {l === "all" ? dict.candidates.all : l}
            </button>
          ))}
        </div>
      </div>
      <div className={styles.filterGroup}>
        <span className={styles.filterLabel}>{dict.candidates.religion}</span>
        <div className={styles.chips}>
          {religions.map((r) => (
            <button
              key={r}
              className={`${styles.chip} ${isActive("religion", religion, r) ? styles.chipActive : ""}`}
              onClick={() => updateParam("religion", r)}
            >
              {r === "all" ? dict.candidates.all : r}
            </button>
          ))}
        </div>
      </div>
      <div className={styles.filterGroup}>
        <span className={styles.filterLabel}>{dict.candidates.availability}</span>
        <div className={styles.chips}>
          {AVAILABILITY.map((a) => (
            <button
              key={a}
              className={`${styles.chip} ${availability === a ? styles.chipActive : ""}`}
              onClick={() => updateParam("availability", a)}
            >
              {a === "all" ? dict.candidates.all : a === "available" ? dict.common.available : dict.common.booked}
            </button>
          ))}
        </div>
      </div>
      <div className={styles.filterGroup}>
        <span className={styles.filterLabel}>{dict.candidates.employmentType}</span>
        <div className={styles.chips}>
          <button
            className={`${styles.chip} ${employment === "all" ? styles.chipActive : ""}`}
            onClick={() => updateParam("employment", "all")}
          >
            {dict.candidates.all}
          </button>
          {EMPLOYMENT_FILTER.map((cat) => (
            <button
              key={cat}
              className={`${styles.chip} ${employment === cat ? styles.chipActive : ""}`}
              onClick={() => updateParam("employment", cat)}
            >
              {dict.common[cat]}
            </button>
          ))}
        </div>
      </div>
      <button className={styles.reset} onClick={resetAll}>
        {dict.common.reset}
      </button>
    </div>
  );

  return (
    <div className="container section">
      <h1 className="section-title">{dict.common.candidates}</h1>
      <p className="section-subtitle">{isAr ? "اختر العاملة المناسبة لاحتياجك" : "Choose the right worker for your needs"}</p>

      {/* اختيار سريع لنوع العمالة */}
      <div className={styles.quickCats} role="group" aria-label={dict.candidates.employmentType}>
        <button
          className={`${styles.quickCat} ${employment === "all" ? styles.quickCatActive : ""}`}
          onClick={() => updateParam("employment", "all")}
        >
          {CAT_LABELS.all}
        </button>
        {QUICK_CATS.map((cat) => (
          <button
            key={cat}
            className={`${styles.quickCat} ${employment === cat ? styles.quickCatActive : ""}`}
            onClick={() => updateParam("employment", cat)}
          >
            {CAT_LABELS[cat]}
          </button>
        ))}
      </div>

      <div className={styles.toolbar}>
        <input
          className={styles.search}
          placeholder={dict.candidates.searchPlaceholder}
          defaultValue={q}
          onChange={(e) => updateParam("q", e.target.value)}
          aria-label={dict.common.search}
        />
        <select
          className={styles.sort}
          value={sort}
          onChange={(e) => updateParam("sort", e.target.value)}
          aria-label={dict.common.sort}
        >
          <option value="recommended">{dict.candidates.sortRecommended}</option>
          <option value="salary_asc">{dict.candidates.sortSalaryAsc}</option>
          <option value="salary_desc">{dict.candidates.sortSalaryDesc}</option>
          <option value="experience">{dict.candidates.sortExperience}</option>
          <option value="name">{dict.candidates.sortName}</option>
        </select>
        <div className={styles.viewToggle}>
          <button
            className={`${styles.viewBtn} ${view === "grid" ? styles.viewActive : ""}`}
            onClick={() => updateParam("view", "grid")}
            aria-label={dict.common.grid}
            aria-pressed={view === "grid"}
          >
            <GridIcon />
          </button>
          <button
            className={`${styles.viewBtn} ${view === "list" ? styles.viewActive : ""}`}
            onClick={() => updateParam("view", "list")}
            aria-label={dict.common.list}
            aria-pressed={view === "list"}
          >
            <ListIcon />
          </button>
        </div>
        <button className={styles.filterBtn} onClick={() => setDrawerOpen(true)}>
          <FilterIcon className={styles.filterBtnIcon} /> {dict.common.filter}
        </button>
      </div>

      <div className={styles.layout}>
        <aside className={styles.sidebar}>{Filters}</aside>
        <div>
          {loading && workers.length === 0 ? (
            <LoadingSkeleton />
          ) : workers.length === 0 ? (
            <div className={styles.empty}>
              <p>{dict.common.noResults}</p>
              <Button href={`/${locale}/contact`} variant="outline" size="sm">
                {dict.candidates.needHelp}
              </Button>
            </div>
          ) : (
            <>
              <div className={view === "list" ? styles.listGrid : styles.grid}>
                {workers.map((w, i) => (
                  <CandidateCard key={w.id} worker={w} dict={dict} locale={locale} view={view} priority={i < 2} />
                ))}
              </div>
              {hasMore && (
                <div style={{ textAlign: "center", marginTop: 32 }}>
                  <button
                    className={styles.loadMore}
                    onClick={() => fetchWorkers(page + 1, false)}
                    disabled={loading}
                  >
                    {loading ? dict.common.loading : dict.common.showMore}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {drawerOpen && (
        <div className={styles.drawerOverlay} onClick={() => setDrawerOpen(false)}>
          <div className={styles.drawer} onClick={(e) => e.stopPropagation()} role="dialog" aria-label={dict.common.filter}>
            <div className={styles.drawerHeader}>
              <h3>{dict.common.filter}</h3>
              <button onClick={() => setDrawerOpen(false)} aria-label={isAr ? "إغلاق" : "Close"} className={styles.drawerClose}><CloseIcon /></button>
            </div>
            {Filters}
            <button className={styles.showResults} onClick={() => setDrawerOpen(false)}>
              {isAr ? "عرض النتائج" : "Show results"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
