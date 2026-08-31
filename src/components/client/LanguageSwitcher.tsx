"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Locale } from "@/lib/i18n";
import styles from "./LanguageSwitcher.module.css";

export function LanguageSwitcher({ locale }: { locale: string }) {
  const pathname = usePathname() || "/";
  const [current, setCurrent] = useState(locale);

  useEffect(() => {
    setCurrent(locale);
  }, [locale]);

  function switchTo(target: Locale) {
    if (target === current) return;
    let newPath = pathname;
    // استبدال مقطع اللغة في بداية المسار مع الحفاظ على باقي المسار (الصفحة الحالية)
    if (pathname.startsWith("/ar") || pathname.startsWith("/en")) {
      newPath = "/" + target + pathname.slice(3);
    } else {
      newPath = "/" + target + (pathname === "/" ? "" : pathname);
    }
    window.location.href = newPath || "/" + target;
  }

  return (
    <div className={styles.switcher} role="group" aria-label={current === "ar" ? "تبديل اللغة" : "Switch language"}>
      <button
        className={`${styles.btn} ${current === "ar" ? styles.active : ""}`}
        onClick={() => switchTo("ar")}
        aria-pressed={current === "ar"}
        aria-label="العربية"
      >
        ع
      </button>
      <button
        className={`${styles.btn} ${current === "en" ? styles.active : ""}`}
        onClick={() => switchTo("en")}
        aria-pressed={current === "en"}
        aria-label="English"
      >
        EN
      </button>
    </div>
  );
}
