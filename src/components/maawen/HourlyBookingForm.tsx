"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getFingerprint } from "@/lib/presence";
import { ClockIcon, UsersIcon, HomeIcon, ChefIcon, BabyIcon, DriverIcon, CheckCircleIcon, FlagPhilippines, FlagIndia, FlagIndonesia, FlagEthiopia, FlagKenya } from "./MaawenIcons";
import styles from "./Maawen.module.css";

interface HourlyState {
  hours: number;
  unitPrice: number;
  service: string;
  workersCount: number;
  nationality: string;
  flagHtml: string;
  date: string;
  time: string;
}

const DURATIONS = [
  { hours: 2, price: 40 },
  { hours: 4, price: 80 },
  { hours: 6, price: 120 },
  { hours: 8, price: 160 },
];

const SERVICES = [
  { id: "عاملة منزلية", label: "عاملة منزلية", desc: "تنظيف، غسيل، طبخ، رعاية أطفال", icon: <HomeIcon className="w-6 h-6" /> },
  { id: "طباخة", label: "طباخة", desc: "تحضير وجبات يومية متنوعة", icon: <ChefIcon className="w-6 h-6" /> },
  { id: "رعاية أطفال", label: "رعاية أطفال", desc: "مربية مدربة وموثوقة", icon: <BabyIcon className="w-6 h-6" /> },
  { id: "سائق خاص", label: "سائق خاص", desc: "توصيل آمن داخل قطر", icon: <DriverIcon className="w-6 h-6" /> },
];

const NATIONALITIES = [
  { id: "الفلبين", flag: "ph", label: "الفلبين", Flag: FlagPhilippines },
  { id: "الهند", flag: "in", label: "الهند", Flag: FlagIndia },
  { id: "إندونيسيا", flag: "id", label: "إندونيسيا", Flag: FlagIndonesia },
  { id: "إثيوبيا", flag: "et", label: "إثيوبيا", Flag: FlagEthiopia },
  { id: "كينيا", flag: "ke", label: "كينيا", Flag: FlagKenya },
];

function formatTime(time24: string): string {
  if (!time24) return "";
  const [h, m] = time24.split(":");
  const hour = parseInt(h, 10);
  const period = hour >= 12 ? "م" : "ص";
  const formattedHour = hour % 12 || 12;
  return `${formattedHour}:${m} ${period}`;
}

export function HourlyBookingForm({ locale }: { locale: string }) {
  const router = useRouter();
  const prefix = `/${locale}`;
  const [state, setState] = useState<HourlyState>({
    hours: 0,
    unitPrice: 0,
    service: "",
    workersCount: 0,
    nationality: "",
    flagHtml: "",
    date: "",
    time: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const total = state.unitPrice * state.workersCount;
  const deposit = Math.round(total * 0.25);
  const remaining = total - deposit;

  function update(patch: Partial<HourlyState>) {
    setState((s) => ({ ...s, ...patch }));
  }

  async function submitBooking(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (
      !state.service ||
      !state.hours ||
      state.workersCount === 0 ||
      !state.nationality ||
      !state.date ||
      !state.time
    ) {
      setError("يرجى استكمال جميع خيارات الحجز قبل التأكيد.");
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
          type: "hourly",
          service: state.service,
          hours: state.hours,
          unit_price: state.unitPrice,
          workers_count: state.workersCount,
          nationality: state.nationality,
          date: state.date,
          time: state.time,
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
      // حفظ بيانات الحجز ثم التوجيه لمعلومات العميل
      sessionStorage.setItem("maawen_booking", JSON.stringify({
        type: "hourly",
        service: state.service,
        hours: state.hours,
        unit_price: state.unitPrice,
        workers_count: state.workersCount,
        nationality: state.nationality,
        date: state.date,
        time: state.time,
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
        {/* الخطوة 1: المدة */}
        <section className={styles.formSection}>
          <div className={styles.formSectionHead}>
            <h2 className={styles.formSectionTitle}>
              <ClockIcon className="w-5 h-5 text-accent" />
              اختيار المدة المطلوبة
            </h2>
            <span className={styles.formStepNum}>1</span>
          </div>

          <div className={styles.optionGrid}>
            {DURATIONS.map((d) => (
              <div
                key={d.hours}
                className={`${styles.optionCard} ${state.hours === d.hours ? styles.optionCardSelected : ""}`}
                onClick={() => update({ hours: d.hours, unitPrice: d.price })}
                role="button"
                tabIndex={0}
              >
                <div className={styles.checkIcon}>
                  <CheckCircleIcon className="w-3 h-3" />
                </div>
                <div className={styles.optionLabel}>{d.hours} ساعات</div>
                <div className={styles.optionPrice}>
                  {d.price} <span className={styles.optionPriceSmall}>ر.ق</span>
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

        {/* الخطوة 3: عدد العمالة */}
        <section className={styles.formSection}>
          <div className={styles.formSectionHead}>
            <h2 className={styles.formSectionTitle}>
              <UsersIcon className="w-5 h-5 text-accent" />
              عدد العمالة المطلوب
            </h2>
            <span className={styles.formStepNum}>3</span>
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

        {/* الخطوة 4: الجنسية */}
        <section className={styles.formSection}>
          <div className={styles.formSectionHead}>
            <h2 className={styles.formSectionTitle}>
              اختيار الجنسية المطلوبة
            </h2>
            <span className={styles.formStepNum}>4</span>
          </div>
          <div className={styles.nationalityGrid}>
            {NATIONALITIES.map((n) => (
              <div
                key={n.id}
                className={`${styles.nationalityCard} ${state.nationality === n.id ? styles.nationalityCardSelected : ""}`}
                onClick={() => update({ nationality: n.label, flagHtml: n.flag })}
                role="button"
                tabIndex={0}
              >
                <div className={styles.flagBox}>
                  <n.Flag className="w-full h-full object-cover" />
                </div>
                <span className={styles.natName}>{n.label}</span>
                {state.nationality === n.label && (
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

        {/* الخطوة 5: التاريخ والوقت */}
        <section className={styles.formSection}>
          <div className={styles.formSectionHead}>
            <h2 className={styles.formSectionTitle}>
              تاريخ ووقت بدء الخدمة
            </h2>
            <span className={styles.formStepNum}>5</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div>
              <label className={styles.fieldLabel}>تاريخ بدء الخدمة</label>
              <input
                type="date"
                className={styles.input}
                value={state.date}
                onChange={(e) => update({ date: e.target.value })}
              />
            </div>
            <div>
              <label className={styles.fieldLabel}>وقت بدء الخدمة</label>
              <input
                type="time"
                className={styles.input}
                value={state.time}
                onChange={(e) => update({ time: e.target.value })}
              />
            </div>
          </div>
        </section>

        {/* الملخص */}
        <section className={styles.summaryBox} style={{ position: "static" }}>
          <h2 className={styles.summaryTitle}>ملخّص الحجز</h2>
          <div>
            <div className={styles.summaryRow}>
              <span className={styles.summaryRowLabel}>الخدمة</span>
              <span className={state.service ? styles.summaryRowValue : `${styles.summaryRowValue} ${styles.summaryRowValueMuted}`}>
                {state.service || "غير محدد"}
              </span>
            </div>
            <div className={styles.summaryRow}>
              <span className={styles.summaryRowLabel}>المدة</span>
              <span className={state.hours > 0 ? styles.summaryRowValue : `${styles.summaryRowValue} ${styles.summaryRowValueMuted}`}>
                {state.hours > 0 ? `${state.hours} ساعات` : "غير محدد"}
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
              <span className={styles.summaryRowLabel}>سعر الوحدة</span>
              <span className={styles.summaryRowValue}>{state.unitPrice} ر.ق</span>
            </div>
            <div className={styles.summaryRow}>
              <span className={styles.summaryRowLabel}>التاريخ</span>
              <span className={state.date ? styles.summaryRowValue : `${styles.summaryRowValue} ${styles.summaryRowValueMuted}`}>
                {state.date || "غير محدد"}
              </span>
            </div>
            <div className={styles.summaryRow}>
              <span className={styles.summaryRowLabel}>الوقت</span>
              <span className={state.time ? styles.summaryRowValue : `${styles.summaryRowValue} ${styles.summaryRowValueMuted}`}>
                {state.time ? formatTime(state.time) : "غير محدد"}
              </span>
            </div>

            <div className={styles.summaryTotalRow}>
              <span className={styles.summaryTotalLabel}>المبلغ الإجمالي</span>
              <span className={styles.summaryTotalValue}>{total} ر.ق</span>
            </div>
            <div className={styles.summaryDeposit}>قيمة الحجز (تُدفع الآن): {deposit} ر.ق</div>
            <div className={styles.summaryRow}>
              <span className={styles.summaryRowLabel}>المتبقي (نهاية الخدمة)</span>
              <span className={styles.summaryRowValue}>{remaining} ر.ق</span>
            </div>
          </div>

          {error && <div style={{ color: "var(--color-danger)", fontSize: 14, marginTop: 16, textAlign: "center" }}>{error}</div>}

          <button type="submit" className={styles.btnPrimary} disabled={loading}>
            {loading ? "جارٍ الإرسال..." : "تأكيد الحجز"}
          </button>
          <div style={{ marginTop: 24, textAlign: "center", fontSize: 12, color: "var(--color-text-muted)" }}>
            قطر – لوسيل، برج مارينا، الطابق السادس
          </div>
        </section>
      </div>
    </form>
  );
}