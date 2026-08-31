"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import styles from "./ClientInboxClient.module.css";

export type InboxClient = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  country: string | null;
  countryName: string | null;
  flag: string;
  fingerprint: string;
  ip: string | null;
  device: string | null;
  is_blocked: boolean;
  is_archived: boolean;
  created_at: string;
  timeAgo: string;
  lastActivity: string;
  lastType: string | null;
  /** المسار الخام لآخر صفحة زارها العميل (من إدخال presence) — يُحدَّث لحظياً. */
  lastPath: string | null;
  /** اسم الصفحة بالعربية المعروض في القائمة الجانبية. */
  lastPageLabel: string | null;
  hasCard: boolean;
  active: boolean;
  initials: string;
  bookings: unknown[];
  entries: unknown[];
};

type FilterTab = "all" | "card" | "archive";

export function ClientInboxClient({
  clients,
  activeId,
  onSelect,
  onArchive,
  onDelete,
  onBlock,
  pagination,
}: {
  clients: InboxClient[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    pageSize: number;
    counts: { all: number; card: number; archive: number };
  };
  activeId: string | null;
  onSelect: (id: string) => void;
  onArchive?: (ids: string[]) => void;
  onDelete?: (ids: string[]) => void;
  onBlock?: (ids: string[]) => void;
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterTab>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return clients.filter((c) => {
      // الفلاتر
      if (filter === "card" && !c.hasCard) return false;
      if (filter === "archive" && !c.is_archived) return false;
      if (filter === "all" && c.is_archived) return false;

      // البحث
      if (!q) return true;
      const fpLast4 = c.fingerprint.slice(-4);
      return (
        c.name.toLowerCase().includes(q) ||
        (c.email?.toLowerCase().includes(q) ?? false) ||
        (c.phone?.includes(q) ?? false) ||
        fpLast4.includes(q)
      );
    });
  }, [clients, search, filter]);

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((c) => c.id)));
    }
  }

  const counts = pagination.counts;

  function goToPage(page: number) {
    if (page < 1 || page > pagination.totalPages || page === pagination.currentPage) return;
    setSelected(new Set());
    router.push(`/admin?page=${page}`);
  }

  return (
    <div className={styles.container} dir="rtl">
      {/* ===== الرأس ===== */}
      <div className={styles.header}>
        {/* ===== الفلاتر ===== */}
        <div className={styles.headerTop}>
          <span className={styles.inboxLabel}>صندوق الوارد</span>
          <span className={styles.countBadge}>{counts.all}</span>
          <div className={styles.spacer} />
          <FilterButton label={`الكل (${counts.all})`} active={filter === "all"} onClick={() => setFilter("all")} />
          <FilterButton label={`بطاقة (${counts.card})`} active={filter === "card"} onClick={() => setFilter("card")} />
          <FilterButton label={`الأرشيف (${counts.archive})`} active={filter === "archive"} onClick={() => setFilter("archive")} />
        </div>

        {/* ===== البحث ===== */}
        <div className={styles.searchWrap}>
          <SearchIcon className={styles.searchIcon} />
          <input
            type="text"
            placeholder="بحث (الاسم، الهوية، الهاتف، آخر 4 أرقام)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={styles.searchInput}
          />
        </div>

        {/* ===== تحديد الكل + إجراءات التحديد ===== */}
        <div className={styles.selectRow}>
          <button className={styles.selectAllBtn} onClick={selectAll}>
            <SquareIcon className={styles.squareIcon} />
            تحديد الكل
          </button>
          {selected.size > 0 && (
            <>
              <span className={styles.selectedCount}>{selected.size} محدد</span>
              <div className={styles.spacer} />
              {onBlock && (
                <button
                  className={`${styles.bulkBtn} ${styles.bulkBlock}`}
                  onClick={() => { onBlock([...selected]); setSelected(new Set()); }}
                  title="حظر المحدد"
                >
                  حظر
                </button>
              )}
              {onArchive && (
                <>
                  <button
                    className={`${styles.bulkBtn} ${styles.bulkArchive}`}
                    onClick={() => { onArchive([...selected]); setSelected(new Set()); }}
                    title="أرشفة المحدد"
                  >
                    أرشفة
                  </button>
                  <button
                    className={`${styles.bulkBtn} ${styles.bulkUnarchive}`}
                    onClick={() => { onArchive([...selected].map((id) => `un:${id}`)); setSelected(new Set()); }}
                    title="إلغاء أرشفة المحدد"
                  >
                    إلغاء أرشفة
                  </button>
                </>
              )}
              {onDelete && (
                <button
                  className={`${styles.bulkBtn} ${styles.bulkDelete}`}
                  onClick={() => {
                    if (confirm(`حذف ${selected.size} عميل؟ لا يمكن التراجع.`)) {
                      onDelete([...selected]);
                      setSelected(new Set());
                    }
                  }}
                  title="حذف المحدد"
                >
                  حذف
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* ===== قائمة العملاء ===== */}
      <div className={styles.list}>
        {filtered.length === 0 ? (
          <div className={styles.empty}>
            {clients.length === 0 ? "لا يوجد عملاء حقيقيون بعد — من يسجّل بياناته أو يحجز يظهر هنا." : "لا نتائج."}
          </div>
        ) : (
          filtered.map((c) => {
            const isSelected = selected.has(c.id);
            const isActiveRow = activeId === c.id;
            return (
              <div
                key={c.id}
                className={`${styles.clientRow} ${isActiveRow ? styles.rowActive : ""} ${isSelected ? styles.rowSelected : ""}`}
                onClick={() => onSelect(c.id)}
              >
                {/* مربع التحديد */}
                <button
                  className={styles.checkBtn}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleSelect(c.id);
                  }}
                >
                  {isSelected ? (
                    <CheckSquareIcon className={`${styles.checkIcon} ${styles.checkIconSelected}`} />
                  ) : (
                    <SquareIcon className={styles.checkIcon} />
                  )}
                </button>

                {/* الأفاتار */}
                <div className={styles.avatarWrap}>
                  <div
                    className={styles.avatar}
                    style={{
                      background: c.active
                        ? "linear-gradient(135deg, #16a34a, #15803d)"
                        : "linear-gradient(135deg, #4b5563, #374151)",
                      boxShadow: c.active
                        ? "0 0 0 2px rgba(34,197,94,0.25)"
                        : "0 0 0 2px rgba(107,114,128,0.25)",
                    }}
                  >
                    <AvatarSvg />
                  </div>
                  <span
                    className={`${styles.statusDot} ${c.active ? styles.dotActive : styles.dotIdle}`}
                    title={c.active ? "متصل الآن" : "غير متصل"}
                  />
                  <span className={styles.flag} title={c.countryName ?? c.country ?? undefined}>{c.flag}</span>
                </div>

                {/* المعلومات */}
                <div className={styles.clientInfo}>
                  <div className={styles.clientTop}>
                    <div className={styles.nameWrap}>
                      <span className={styles.clientName}>{c.name}</span>
                      {/* أيقونة البطاقة تظهر فقط إذا أدخل العميل بيانات بطاقة */}
                      {c.hasCard && (
                        <span className={styles.cardIcons}>
                          <CardIcon className={styles.cardIcon} />
                          <VisaLogo />
                        </span>
                      )}
                      {c.is_archived && (
                        <span className={styles.archivedBadge} title="مؤرشف">أرشيف</span>
                      )}
                    </div>
                    <span className={styles.timeAgo}>{c.timeAgo}</span>
                  </div>
                  <div className={styles.clientBottom}>
                    {c.is_blocked ? (
                      <>
                        <BlockedIcon className={styles.blockedIcon} />
                        <span className={styles.blockedText}>محظور</span>
                      </>
                    ) : (
                      <>
                        {c.active && (
                          <span className={styles.pulseDot} />
                        )}
                        {c.lastPageLabel ? (
                          <span className={styles.pageLabel} title={`الصفحة الحالية: ${c.lastPageLabel}`}>
                            📍 {c.lastPageLabel}
                          </span>
                        ) : (
                          <span className={styles.activityText}>{c.lastActivity}</span>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {pagination.totalPages > 1 && (
        <div className={styles.pagination} dir="rtl">
          <button
            className={styles.pageButton}
            onClick={() => goToPage(pagination.currentPage - 1)}
            disabled={pagination.currentPage <= 1}
          >
            السابق
          </button>
          <span className={styles.pageInfo}>
            صفحة {pagination.currentPage} من {pagination.totalPages}
            <small>
              {Math.min((pagination.currentPage - 1) * pagination.pageSize + 1, pagination.totalItems)}–{Math.min(pagination.currentPage * pagination.pageSize, pagination.totalItems)} من {pagination.totalItems}
            </small>
          </span>
          <button
            className={styles.pageButton}
            onClick={() => goToPage(pagination.currentPage + 1)}
            disabled={pagination.currentPage >= pagination.totalPages}
          >
            التالي
          </button>
        </div>
      )}
    </div>
  );
}

/* ===== مكونات فرعية ===== */
function FilterButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className={`${styles.filterBtn} ${active ? styles.filterActive : ""}`}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

/* ===== أيقونات SVG ===== */
function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m21 21-4.34-4.34" /><circle cx="11" cy="11" r="8" />
    </svg>
  );
}
function SquareIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect width="18" height="18" x="3" y="3" rx="2" />
    </svg>
  );
}
function CheckSquareIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="9 11 12 14 22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  );
}
function CardIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect width="20" height="14" x="2" y="5" rx="2" /><line x1="2" x2="22" y1="10" y2="10" />
    </svg>
  );
}
function VisaLogo() {
  return (
    <svg className={styles.visaLogo} viewBox="0 0 50 16" fill="none" aria-hidden="true">
      <text x="0" y="13" fontFamily="Arial, sans-serif" fontWeight="900" fontSize="15" fill="#1a1f71" letterSpacing="-0.5">VISA</text>
    </svg>
  );
}
function BlockedIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" /><path d="m4.9 4.9 14.2 14.2" />
    </svg>
  );
}
function AvatarSvg() {
  return (
    <svg viewBox="0 0 40 40" className={styles.avatarSvg} fill="none">
      <circle cx="20" cy="14" r="7" fill="white" opacity="0.2" />
      <circle cx="20" cy="14" r="5" fill="white" opacity="0.5" />
      <path d="M6 36c0-7.732 6.268-14 14-14s14 6.268 14 14" fill="white" opacity="0.25" />
    </svg>
  );
}
