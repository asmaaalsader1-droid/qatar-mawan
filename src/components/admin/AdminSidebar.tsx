"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { usePathname } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import styles from "./AdminSidebar.module.css";

const NAV = [
  { href: "/admin", label: "لوحة التحكم", icon: "📊" },
  { href: "/admin/presence", label: "الحضور (24h)", icon: "👥" },
  { href: "/admin/workers", label: "العاملات", icon: "👤" },
  { href: "/admin/bookings", label: "الحجوزات", icon: "📅" },
  { href: "/admin/block-client", label: "العملاء", icon: "🚫" },
  { href: "/admin/blog", label: "المدونة", icon: "📝" },
  { href: "/admin/content", label: "المحتوى", icon: "✏️" },
  { href: "/admin/settings", label: "الإعدادات", icon: "⚙️" },
];

function currentLabel(pathname: string): string {
  for (const item of NAV) {
    if (item.href === "/admin") {
      if (pathname === "/admin") return item.label;
    } else if (pathname.startsWith(item.href)) {
      return item.label;
    }
  }
  return NAV[0].label;
}

export type AdminStats = {
  /** زوار اليوم (من جدول daily_visitors) — كل من فتح الموقع، حتى لو لم يتفاعل. */
  todayVisitors: number;
  weekVisitors: number;
  totalVisitors: number;
  /** العملاء الحقيقيون النشطون اليوم (حجز/تسجيل/دفع/استفسار/دخول معاون). */
  activeToday: number;
  /** إجمالي العملاء الحقيقيين (تفاعل فعلي وليس مجرد تصفح). */
  totalCustomers: number;
  bookingsCount: number;
  paidBookings: number;
  pendingBookings: number;
  inquiriesCount: number;
  maawenCount: number;
  clientsCount: number;
  adminEmail: string;
};

export function AdminSidebar({ stats }: { stats: AdminStats }) {
  const pathname = usePathname();
  const router = useRouter();
  const [navOpen, setNavOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const navRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (navRef.current && !navRef.current.contains(e.target as Node)) setNavOpen(false);
      if (userRef.current && !userRef.current.contains(e.target as Node)) setUserOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/ar/login");
    router.refresh();
  }

  const adminInitial = (stats.adminEmail?.[0] ?? "A").toUpperCase();

  return (
    <div className={styles.topbar} dir="rtl">
      {/* الشعار */}
      <Link href="/admin" className={styles.brand}>
        <span className={styles.brandLogo}>خ</span>
        <span className={styles.brandName}>خدم قطر</span>
      </Link>

      {/* شريط الإحصائيات */}
      <div className={styles.statsBar}>
        <div className={styles.statItem} title="عملاء نشطون اليوم (تسجيل/حجز/دفع/استفسار)">
          <span className={styles.pulseDot} />
          <span className={styles.statValueGreen}>{stats.activeToday}</span>
          <UsersIcon className={styles.statIconMuted} />
        </div>

        <div className={styles.statItem} title="العملاء الحقيقيون اليوم (بدون زوار الصفحات)">
          <TrendingIcon className={styles.statIconMuted} />
          <span className={styles.statLabelSm}>اليوم</span>
          <span className={styles.statValueBold}>{stats.activeToday}</span>
        </div>

        <div className={styles.statItem} title="إجمالي العملاء الحقيقيين">
          <GlobeIcon className={styles.statIconMuted} />
          <span className={styles.statLabelSm}>إجمالي</span>
          <span className={styles.statValueBold}>{stats.totalCustomers}</span>
        </div>

        <div className={styles.statItem} title="الحجوزات">
          <CardIcon className={styles.statIconBlue} />
          <span className={styles.statValueBlue}>{stats.bookingsCount}</span>
        </div>

        <div className={styles.statItem} title="الاستفسارات">
          <PhoneIcon className={styles.statIconEmerald} />
          <span className={styles.statValueEmerald}>{stats.inquiriesCount}</span>
        </div>

        <div className={styles.statItem} title="طلبات معاون (حجز/معلومات/دفع)">
          <span className={styles.statLabelSm}>معاون</span>
          <span className={styles.statValueBlue}>{stats.maawenCount}</span>
        </div>

        <div className={styles.divider} />

        <div className={styles.statItem} title="زوار الموقع: اليوم / الأسبوع / الإجمالي (من daily_visitors)">
          <span className={styles.statLabelSm}>زوار</span>
          <span className={styles.statValueGreen}>{stats.todayVisitors}</span>
          <span className={styles.slash}>/</span>
          <span className={styles.statValueAmber}>{stats.weekVisitors}</span>
          <span className={styles.slash}>/</span>
          <span className={styles.statValueGray}>{stats.totalVisitors}</span>
        </div>

        <div className={styles.statItem} title="عملاء حقيقيون / حجوزات / زوار">
          <span className={styles.statLabelSm}>عملاء</span>
          <span className={styles.statValueGreen}>{stats.totalCustomers}</span>
          <span className={styles.slash}>/</span>
          <span className={styles.statValueAmber}>{stats.bookingsCount}</span>
          <span className={styles.slash}>/</span>
          <span className={styles.statValueGray}>{stats.totalVisitors}</span>
        </div>
      </div>

      {/* القسم الأيمن: قائمة التنقل + الإعدادات + التنبيهات + المستخدم */}
      <div className={styles.rightSection}>
        <div className={styles.menuWrap} ref={navRef}>
          <button
            className={styles.menuBtn}
            onClick={() => { setNavOpen((v) => !v); setUserOpen(false); }}
            aria-label="قائمة التنقل"
            aria-expanded={navOpen}
          >
            <span className={styles.menuLabel}>{currentLabel(pathname)}</span>
            <span className={`${styles.caret} ${navOpen ? styles.caretOpen : ""}`}>▾</span>
          </button>
          {navOpen && (
            <nav className={styles.dropdown}>
              {NAV.map((item) => {
                const active = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
                return (
                  <Link
                    href={item.href}
                    key={item.href}
                    className={`${styles.navItem} ${active ? styles.navActive : ""}`}
                    onClick={() => setNavOpen(false)}
                  >
                    <span className={styles.navIcon}>{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          )}
        </div>

        <Link href="/admin/settings" className={styles.iconBtn} title="الإعدادات">
          <SettingsIcon />
        </Link>

        <Link href="/admin/bookings" className={styles.iconBtn} title={`حجوزات معلقة: ${stats.pendingBookings}`}>
          <BellIcon />
          {stats.pendingBookings > 0 && (
            <span className={styles.badgeCount}>{stats.pendingBookings}</span>
          )}
        </Link>

        <div className={styles.menuWrap} ref={userRef}>
          <button
            className={styles.userBtn}
            onClick={() => { setUserOpen((v) => !v); setNavOpen(false); }}
            title={stats.adminEmail}
          >
            <span className={styles.avatar}>{adminInitial}</span>
            <span className={styles.caretSmall}>▾</span>
          </button>
          {userOpen && (
            <div className={styles.userDropdown}>
              <div className={styles.userEmail}>{stats.adminEmail}</div>
              <Link href="/admin/settings" className={styles.userMenuItem} onClick={() => setUserOpen(false)}>
                ⚙️ الإعدادات
              </Link>
              <button className={styles.userMenuItem} onClick={handleLogout}>
                🚪 تسجيل الخروج
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* أيقونات SVG مدمجة */
function UsersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><path d="M16 3.128a4 4 0 0 1 0 7.744" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><circle cx="9" cy="7" r="4" />
    </svg>
  );
}
function TrendingIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M16 7h6v6" /><path d="m22 7-8.5 8.5-5-5L2 17" />
    </svg>
  );
}
function GlobeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" /><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" /><path d="M2 12h20" />
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
function PhoneIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M13.832 16.568a1 1 0 0 0 1.213-.303l.355-.465A2 2 0 0 1 17 15h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2A18 18 0 0 1 2 4a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v3a2 2 0 0 1-.8 1.6l-.468.351a1 1 0 0 0-.292 1.233 14 14 0 0 0 6.392 6.384" />
    </svg>
  );
}
function SettingsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915" /><circle cx="12" cy="12" r="3" />
    </svg>
  );
}
function BellIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10.268 21a2 2 0 0 0 3.464 0" /><path d="M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326" />
    </svg>
  );
}
