"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getFingerprint } from "@/lib/presence";
import { CalendarIcon, UsersIcon, HomeIcon, ChefIcon, BabyIcon, CheckCircleIcon, FlagPhilippines, FlagIndia, FlagIndonesia, FlagEthiopia, FlagKenya } from "./MaawenIcons";
import styles from "./Maawen.module.css";

interface MonthlyState {
  duration: string;
  basePrice: number;
  service: string;
  workType: string;
  workersCount: number;
  nationality: string;
  date: string;
}

const DURATIONS = [
  { duration: "أسبوعان (14 زيارة)", price: 640 },
  { duration: "شهر واحد", price: 1280, best: true },
  { duration: "شهران", price: 2560 },
  { duration: "3 شهور", price: 3840 },
  { duration: "6 شهور", price: 7000 },
  { duration: "سنة كاملة", price: 13500 },
];

const SERVICES = [
  { id: "عاملة منزلية", label: "عاملة منزلية", desc: "تنظيف، غسيل، طبخ، رعاية أطفال", icon: <HomeIcon className="w-6 h-6" /> },
  { id: "طباخة", label: "طباخة", desc: "تحضير وجبات يومية متنوعة", icon: <ChefIcon className="w-6 h-6" /> },
  { id: "رعاية أطفال", label: "رعاية أطفال", desc: "مربية مدربة وموثوقة", icon: <BabyIcon className="w-6 h-6" /> },
];

const WORK_TYPES = [
  { id: "دوام كامل", label: "دوام كامل" },
  { id: "دوام جزئي", label: "دوام جزئي" },
];

const NATIONALITIES = [
  { id: "الفلبين", label: "الفلبين", Flag: FlagPhilippines },
  { id: "الهند", label: "الهند", Flag: FlagIndia },
  { id: "إندونيسيا", label: "إندونيسيا", Flag: FlagIndonesia },
  { id: "إثيوبيا", label: "إثيوبيا", Flag: FlagEthiopia },
  { id: "كينيا", label: "كينيا", Flag: FlagKenya },
];

export function MonthlyBookingForm({ locale }: { locale: string }) {
  const router = useRouter();
  const prefix = `/${locale}`;
  const [state, setState] = useState<MonthlyState>({
    duration: "",
    basePrice: 0,
    service: "",
    workType: "",
    workersCount: 0,
    nationality: "",
    date: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const total = state.basePrice * state.workersCount;
  const deposit = state.workersCount > 0 ? 30 : 0;
  const remaining = Math.max(0, total - deposit);

  function update(patch: Partial<MonthlyState>) {
    setState((s) => ({ ...s, ...patch }));
  }

  async function submitBooking(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (
      !state.duration ||
      !state.service ||
      !state.workType ||
      state.workersCount === 0 ||
      !state.nationality ||
      !state.date
    ) {
      setError("يرجى استكمال جميع خيارات العقد قبل التأكيد.");
      return;
    }
    setError(null);
    setLoading(true);
    const fingerprint = typeof window !== "undefined" ? getFingerprint() : "ssr";
    try {
      const res = await fetch("/api/maawen/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-fingerprint": fingerprint },
        body: JSON.stringify({
          type: "monthly",
          service: state.service,
          contract_duration: state.duration,
          unit_price: state.basePrice,
          workers_count: state.workersCount,
          nationality: state.nationality,
          service_type: state.workType,
          date: state.date,
          total,
          deposit,
          remaining,
        }),
      });
      const result = await res.json();
      setLoading(false);
      if (!res.ok) {
        setError(result.error || "حدث خطأ في إرسال الطلب");
        return;
      }
      sessionStorage.setItem("maawen_booking", JSON.stringify({
        type: "monthly",
        service: state.service,
        contract_duration: state.duration,
        unit_price: state.basePrice,
        workers_count: state.workersCount,
        nationality: state.nationality,
        work_type: state.workType,
        date: state.date,
        total,
        deposit,
        remaining,
        bookingRef: result.bookingRef,
        bookingId: result.bookingId,
      }));
      router.push(`${prefix}/client-info`);
    } catch {
      setLoading(false);
      setError("حدث خطأ في إرسال الطلب");
    }
  }

  return (
    <form onSubmit={submitBooking}>
      <div className="grid" style={{ gridTemplateColumns: "1fr", gap: 32 }}>
        {/* الخطوة 1: مدة العقد */}
        <section className={styles.formSection}>
          <div className={styles.formSectionHead}>
            <h2 className={styles.formSectionTitle}>
              <CalendarIcon className="w-5 h-5 text-accent" />
              اختيار مدة العقد
            </h2>
            <span className={styles.formStepNum}>1</span>
          </div>
          <div className={styles.optionGrid}>
            {DURATIONS.map((d) => (
              <div
                key={d.duration}
                className={`${styles.optionCard} ${state.duration === d.duration ? styles.optionCardSelected : ""} ${d.best ? styles.bestValue : ""}`}
                onClick={() => update({ duration: d.duration, basePrice: d.price })}
                role="button"
                tabIndex={0}
              >
                {d.best && <span className={styles.bestBadge}>الأوفر</span>}
                <div className={styles.checkIcon}>
                  <CheckCircleIcon className="w-3 h-3" />
                </div>
                <div className={styles.optionLabel}>{d.duration}</div>
                <div className={styles.optionPrice}>
                  {d.price.toLocaleString()} <span className={styles.optionPriceSmall}>ر.ق</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* الخطوة 2: الخدمة */}
        <section className={styles.formSection}>
          <div className={styles.formSectionHead}>
            <h2 className={styles.formSectionTitle}>
              <UsersIcon className="w-5 h-5 text-accent" />
              اختيار الخدمة المطلوبة
            </h2>
            <span className={styles.formStepNum}>2</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {SERVICES.map((s) => (
              <div
                key={s.id}
                className={`${styles.serviceCardRow} ${state.service === s.id ? styles.serviceCardRowSelected : ""}`}
                onClick={() => update({ service: s.id })}
                role="button"
                tabIndex={0}
              >
                <div className={styles.serviceCardRowBody}>
                  <div className={styles.serviceCardIcon}>{s.icon}</div>
                  <div>
                    <h3 className={styles.optionLabel}>{s.label}</h3>
                    <p style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 2 }}>{s.desc}</p>
                    {state.service === s.id && (
                      <span className="text-[11px] text-accent font-bold mt-1 block">✓ تم اختيارها</span>
                    )}
                  </div>
                </div>
                <div className={styles.checkIcon} style={{ position: "static" }}>
                  <CheckCircleIcon className="w-3.5 h-3.5" />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* الخطوة 3: نمط الدوام */}
        <section className={styles.formSection}>
          <div className={styles.formSectionHead}>
            <h2 className={styles.formSectionTitle}>نمط الدوام</h2>
            <span className={styles.formStepNum}>3</span>
          </div>
          <div className={styles.optionGrid}>
            {WORK_TYPES.map((w) => (
              <div
                key={w.id}
                className={`${styles.optionCard} ${state.workType === w.id ? styles.optionCardSelected : ""}`}
                onClick={() => update({ workType: w.id })}
                role="button"
                tabIndex={0}
              >
                <div className={styles.checkIcon}>
                  <CheckCircleIcon className="w-3 h-3" />
                </div>
                <div className={styles.optionLabel}>{w.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* الخطوة 4: عدد العمالة */}
        <section className={styles.formSection}>
          <div className={styles.formSectionHead}>
            <h2 className={styles.formSectionTitle}>
              <UsersIcon className="w-5 h-5 text-accent" />
              عدد العمالة المطلوب
            </h2>
            <span className={styles.formStepNum}>4</span>
          </div>
          <div className={styles.counter}>
            <div className={styles.counterRow}>
              <button type="button" className={styles.counterBtn} onClick={() => update({ workersCount: Math.max(0, state.workersCount - 1) })}>-</button>
              <div>
                <span className={styles.counterValue}>{state.workersCount}</span>
                <span className={styles.counterLabel}>عامل/عاملة</span>
              </div>
              <button type="button" className={styles.counterBtn} onClick={() => update({ workersCount: state.workersCount + 1 })}>+</button>
            </div>
          </div>
        </section>

        {/* الخطوة 5: الجنسية */}
        <section className={styles.formSection}>
          <div className={styles.formSectionHead}>
            <h2 className={styles.formSectionTitle}>اختيار الجنسية المطلوبة</h2>
            <span className={styles.formStepNum}>5</span>
          </div>
          <div className={styles.nationalityGrid}>
            {NATIONALITIES.map((n) => (
              <div
                key={n.id}
                className={`${styles.nationalityCard} ${state.nationality === n.id ? styles.nationalityCardSelected : ""}`}
                onClick={() => update({ nationality: n.id })}
                role="button"
                tabIndex={0}
              >
                <div className={styles.flagBox}>
                  <n.Flag className="w-full h-full object-cover" />
                </div>
                <span className={styles.natName}>{n.label}</span>
                {state.nationality === n.id && (
                  <span className="text-[10px] text-accent font-bold mt-1 block">✓ تم اختيارها</span>
                )}
              </div>
            ))}
          </div>
          <div className={styles.selectedNat}>
            <span className={styles.selectedNatLabel}>الجنسية المختارة</span>
            <div className={styles.selectedNatValue}>
              <span>{state.nationality || "لم يتم الاختيار"}</span>
            </div>
          </div>
        </section>

        {/* الخطوة 6: تاريخ البدء */}
        <section className={styles.formSection}>
          <div className={styles.formSectionHead}>
            <h2 className={styles.formSectionTitle}>تاريخ بدء الخدمة</h2>
            <span className={styles.formStepNum}>6</span>
          </div>
          <div>
            <label className={styles.fieldLabel}>تاريخ بدء الخدمة</label>
            <input
              type="date"
              className={styles.input}
              value={state.date}
              onChange={(e) => update({ date: e.target.value })}
            />
          </div>
        </section>

        {/* الملخص */}
        <section className={styles.summaryBox} style={{ position: "static" }}>
          <h2 className={styles.summaryTitle}>ملخّص الحجز</h2>
          <div>
            <div className={styles.summaryRow}>
              <span className={styles.summaryRowLabel}>مدة العقد</span>
              <span className={state.duration ? styles.summaryRowValue : `${styles.summaryRowValue} ${styles.summaryRowValueMuted}`}>
                {state.duration || "غير محدد"}
              </span>
            </div>
            <div className={styles.summaryRow}>
              <span className={styles.summaryRowLabel}>الخدمة</span>
              <span className={state.service ? styles.summaryRowValue : `${styles.summaryRowValue} ${styles.summaryRowValueMuted}`}>
                {state.service || "غير محدد"}
              </span>
            </div>
            <div className={styles.summaryRow}>
              <span className={styles.summaryRowLabel}>نمط الدوام</span>
              <span className={state.workType ? styles.summaryRowValue : `${styles.summaryRowValue} ${styles.summaryRowValueMuted}`}>
                {state.workType || "غير محدد"}
              </span>
            </div>
            <div className={styles.summaryRow}>
              <span className={styles.summaryRowLabel}>عدد العمالة</span>
              <span className={styles.summaryRowValue}>{state.workersCount}</span>
            </div>
            <div className={styles.summaryRow}>
              <span className={styles.summaryRowLabel}>الجنسية</span>
              <span className={state.nationality ? styles.summaryRowValue : `${styles.summaryRowValue} ${styles.summaryRowValueMuted}`}>
                {state.nationality || "غير محدد"}
              </span>
            </div>
            <div className={styles.summaryRow}>
              <span className={styles.summaryRowLabel}>سعر العقد</span>
              <span className={styles.summaryRowValue}>{state.basePrice.toLocaleString()} ر.ق</span>
            </div>
            <div className={styles.summaryRow}>
              <span className={styles.summaryRowLabel}>التاريخ</span>
              <span className={state.date ? styles.summaryRowValue : `${styles.summaryRowValue} ${styles.summaryRowValueMuted}`}>
                {state.date || "غير محدد"}
              </span>
            </div>

            <div className={styles.summaryTotalRow}>
              <span className={styles.summaryTotalLabel}>المبلغ الإجمالي</span>
              <span className={styles.summaryTotalValue}>{total.toLocaleString()} ر.ق</span>
            </div>
            <div className={styles.summaryDeposit}>قيمة الحجز (تُدفع الآن): {deposit} ر.ق</div>
            <div className={styles.summaryRow}>
              <span className={styles.summaryRowLabel}>المتبقي (نهاية الخدمة)</span>
              <span className={styles.summaryRowValue}>{remaining.toLocaleString()} ر.ق</span>
            </div>
          </div>

          {error && <div style={{ color: "var(--color-danger)", fontSize: 14, marginTop: 16, textAlign: "center" }}>{error}</div>}

          <button type="submit" className={styles.btnPrimary} disabled={loading}>
            {loading ? "جارٍ الإرسال..." : "تأكيد الطلب"}
          </button>
          <div style={{ marginTop: 24, textAlign: "center", fontSize: 12, color: "var(--color-text-muted)" }}>
            قطر – لوسيل، برج مارينا، الطابق السادس
          </div>
        </section>
      </div>
    </form>
  );
}