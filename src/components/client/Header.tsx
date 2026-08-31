"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { Dictionary } from "@/lib/i18n";
import { SITE } from "@/config/site";
import { Button } from "@/components/ui/Button";
import { MenuIcon, CloseIcon } from "@/components/ui/Icons";
import styles from "./Header.module.css";

export function Header({ dict, locale }: { dict: Dictionary; locale: string }) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname() || "";
  const router = useRouter();
  const prefix = `/${locale}`;
  const brandName = locale === "ar" ? SITE.nameAr : SITE.nameEn;
  const isAr = locale === "ar";

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // تحميل تمهيدي منخفض الأولوية لمساري العاملات الأكثر استخداماً.
  // لا يرسل طلبات حضور أو يغيّر Realtime؛ Next.js يخزّن RSC في ذاكرة التنقل
  // ويكمل الصفحة عند فتحها فعلياً.
  useEffect(() => {
    const routes = [
      `${prefix}/candidates`,
      `${prefix}/candidates?employment=hourly`,
    ];
    const warmWorkerAssets = async () => {
      routes.forEach((route) => router.prefetch(route));
      try {
        const res = await fetch("/api/candidates?page=1&pageSize=12&sort=recommended", {
          cache: "force-cache",
        });
        if (!res.ok) return;
        const data = (await res.json()) as {
          items?: Array<{ photo_url?: string | null; updated_at?: string | null; id?: string }>;
        };
        for (const worker of (data.items ?? []).slice(0, 6)) {
          if (!worker.photo_url) continue;
          const image = new window.Image();
          const version = worker.updated_at || worker.id || "worker";
          image.src = `${worker.photo_url}${worker.photo_url.includes("?") ? "&" : "?"}v=${encodeURIComponent(version)}`;
        }
      } catch {
        // التحميل التمهيدي اختياري؛ لا يؤثر على فتح الصفحة أو الاتصالات اللحظية.
      }
    };
    const idle = window.setTimeout(() => void warmWorkerAssets(), 250);
    return () => window.clearTimeout(idle);
  }, [prefix, router]);

  // روابط التنقل تعرض العاملات مع فلترة تلقائية حسب نوع التوظيف
  // داخل صفحة العاملات الجديدة (/candidates) — لا صفحات الحجز القديمة.
  const nav = [
    { href: `${prefix}`, label: dict.common.home },
    { href: `${prefix}/candidates`, label: isAr ? "العاملات" : "Candidates" },
    { href: `${prefix}/candidates?employment=hourly`, label: isAr ? "عمالة بالساعة" : "Hourly" },
    { href: `${prefix}/candidates?employment=monthly`, label: isAr ? "عمالة بالشهر" : "Monthly" },
    { href: `${prefix}/candidates?employment=recruitment`, label: isAr ? "استقدام" : "Recruitment" },
  ];

  return (
    <header className={`${styles.header} ${scrolled ? styles.scrolled : ""}`}>
      <div className={`container ${styles.inner}`}>
        <Link href={prefix} className={styles.logo} aria-label={brandName}>
          <Image
            src="/logo.png"
            alt={brandName}
            width={689}
            height={362}
            className={styles.logoImage}
            priority
          />
        </Link>

        <nav className={styles.nav} aria-label={locale === "ar" ? "التنقل الرئيسي" : "Main navigation"}>
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`${styles.link} ${pathname === item.href ? styles.active : ""}`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className={styles.cta}>
          <Button href={`${prefix}/candidates?employment=hourly`} size="sm">
            {isAr ? "احجز الآن" : "Book now"}
          </Button>
        </div>

        <button
          className={styles.menuBtn}
          onClick={() => setMenuOpen((o) => !o)}
          aria-label={menuOpen ? (locale === "ar" ? "إغلاق القائمة" : "Close menu") : (locale === "ar" ? "فتح القائمة" : "Open menu")}
          aria-expanded={menuOpen}
        >
          {menuOpen ? <CloseIcon /> : <MenuIcon />}
        </button>
      </div>

      {menuOpen && (
        <div className={styles.mobileNav}>
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={styles.mobileLink}
              onClick={() => setMenuOpen(false)}
            >
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </header>
  );
}
