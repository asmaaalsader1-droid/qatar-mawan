"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import styles from "./Maawen.module.css";

export function AmountSummary({ locale }: { locale: string }) {
  const router = useRouter();
  const prefix = `/${locale}`;
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [noBooking, setNoBooking] = useState(false);

  const service = searchParams.get("service") || "";
  const totalOrder = Number(searchParams.get("total") || 0);
  const bookingId = searchParams.get("bookingId") || "";
  const paymentFee = 30;

  // بيانات العميل من sessionStorage
  let clientName = "";
  let clientPhone = "";
  let clientAddress = "";
  if (typeof window !== "undefined") {
    try {
      const c = JSON.parse(sessionStorage.getItem("maawen_client") || "{}");
      clientName = c.full_name || "";
      clientPhone = c.phone || "";
      clientAddress = c.address || "";
    } catch {
      // ignore
    }
  }

  const remaining = Math.max(0, totalOrder - paymentFee);

  function handlePayment() {
    // نقل الزائر إلى صفحة الدفع الجاهزة في المشروع (/payment/{bookingId})
    // والتي تُنهي الدفع عبر تدفق الموافقة + رمز التحقق (OTP) الموجود.
    // المبلغ يُحسب هناك من العاملة التمثيلية لمعاون (27 ر.ق) ليكون
    // الناتج النهائي بعد رسوم الخدمة (10%) = 30 ر.ق بالضبط.
    if (!bookingId) {
      setNoBooking(true);
      setLoading(false);
      return;
    }
    setLoading(true);
    router.push(`${prefix}/payment/${bookingId}`);
  }

  return (
    <div className={styles.amountCards}>
      {/* بطاقة التوثيق */}
      <div className={styles.amountCard}>
        <div className={styles.stampHeader}>
          <div className={styles.stampText}>
            <span className={styles.stampLabel}>دولة قطر - وزارة العمل</span>
            <h1 className={styles.stampTitle}>ملخص الطلب الرسمي</h1>
          </div>
          <div className={`${styles.stampIcon} ${styles.stampIconBorder}`} aria-hidden="true">
            <svg viewBox="0 0 100 100" className={styles.stampSvg} fill="currentColor">
              <path d="M50 5 L60 35 L95 35 L67 55 L78 90 L50 70 L22 90 L33 55 L5 35 L40 35 Z" opacity="0.15" />
              <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="3" />
              <path d="M30 65 Q50 35 70 65" fill="none" stroke="currentColor" strokeWidth="4" />
            </svg>
          </div>
        </div>
        <p className={styles.stampNote}>طلبك موثّق ومُسجّل لدى وزارة العمل في دولة قطر لضمان حقوق العميل والعامل.</p>
      </div>

      {/* تفاصيل الدفع */}
      <div className={styles.amountCard}>
        <h2 className={styles.amountTitle}>تفاصيل الدفع</h2>

        <div className={styles.noteBox}>
          <div>
            <h3 className={styles.noteTitle}>لماذا 30 ريال قطري الآن؟</h3>
            <p className={styles.noteText}>
              يُدفع مبلغ <strong>30 ر.ق</strong> كرسوم رسمية لإصدار وتوثيق العقد من خلال وزارة العمل في دولة قطر، لضمان حماية حقوق الطرفين بشكل قانوني وموثّق.
            </p>
            <p className={styles.noteText}>هذا العرض مقدم من وزارة العمل بمناسبة انطلاق منصة معاون.</p>
          </div>
        </div>

        <div className={styles.amountRows}>
          <div className={styles.summaryRow}>
            <span className={styles.summaryRowLabel}>إجمالي قيمة الطلب</span>
            <span className={styles.summaryRowValue}>{totalOrder.toLocaleString()} ر.ق</span>
          </div>
          <div className={styles.summaryRow}>
            <span className={styles.summaryRowLabel}>رسوم توثيق العقد <span className={styles.amountAccent}>(تُدفع الآن)</span></span>
            <span className={styles.amountAccentValue}>{paymentFee} ر.ق</span>
          </div>
          <div className={styles.summaryRow}>
            <span className={styles.summaryRowLabel}>المبلغ المتبقي</span>
            <span className={styles.summaryRowValue}>{remaining.toLocaleString()} ر.ق</span>
          </div>
        </div>

        <div className={styles.amountDueRow}>
          <span className={styles.amountDueLabel}>المطلوب دفعه الآن</span>
          <span className={styles.amountDueValue}>{paymentFee} <span className={styles.amountDueUnit}>ر.ق</span></span>
        </div>

        <button className={styles.btnPrimary} onClick={handlePayment} disabled={loading}>
          {loading ? "جارٍ التحويل..." : `ادفع ${paymentFee} ر.ق الآن`}
        </button>

        {noBooking && (
          <div className={styles.amountError}>
            لا يوجد حجز نشط لهذا الطلب. يرجى العودة واختيار الخدمة لإكمال الحجز ثم الدفع.
          </div>
        )}

        <div className={styles.secureNote}>
          <span className={styles.secureDot}>✓</span>
          دفع آمن ومشفّر — رسوم رسمية معتمدة من وزارة العمل
        </div>

        {loading && (
          <div className={styles.paymentSuccess}>
            <p><strong>جارٍ تحويلك إلى صفحة الدفع الآمن...</strong></p>
          </div>
        )}
      </div>

      {/* بيانات العميل والخدمة */}
      <div className={styles.amountCard}>
        <h2 className={styles.amountTitle}>بيانات العميل والخدمة</h2>
        <div className={styles.amountRows}>
          <div className={styles.summaryRow}>
            <span className={styles.summaryRowLabel}>الخدمة المطلوبة</span>
            <span className={clientName || service ? styles.summaryRowValue : `${styles.summaryRowValue} ${styles.summaryRowValueMuted}`}>
              {service || (clientName ? "—" : "—")}
            </span>
          </div>
          <div className={styles.summaryRow}>
            <span className={styles.summaryRowLabel}>الاسم</span>
            <span className={clientName ? styles.summaryRowValue : `${styles.summaryRowValue} ${styles.summaryRowValueMuted}`}>
              {clientName || "—"}
            </span>
          </div>
          <div className={styles.summaryRow}>
            <span className={styles.summaryRowLabel}>رقم الجوال</span>
            <span className={clientPhone ? styles.summaryRowValue : `${styles.summaryRowValue} ${styles.summaryRowValueMuted}`} dir="ltr">
              {clientPhone ? `+974 ${clientPhone}` : "—"}
            </span>
          </div>
          <div className={styles.summaryRow}>
            <span className={styles.summaryRowLabel}>العنوان</span>
            <span className={clientAddress ? styles.summaryRowValue : `${styles.summaryRowValue} ${styles.summaryRowValueMuted}`}>
              {clientAddress || "—"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}