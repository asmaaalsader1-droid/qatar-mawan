"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getFingerprint } from "@/lib/presence";
import styles from "./Maawen.module.css";

interface ClientInfo {
  full_name: string;
  national_id: string;
  phone: string;
  address: string;
}

export function ClientInfoForm({ locale }: { locale: string }) {
  const router = useRouter();
  const prefix = `/${locale}`;
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [nationalId, setNationalId] = useState("");
  const [phone, setPhone] = useState("");

  function toAsciiDigits(value: string): string {
    return value
      .replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - 1632))
      .replace(/[۰-۹]/g, (digit) => String(digit.charCodeAt(0) - 1776))
      .replace(/\D/g, "");
  }

  function validate(data: ClientInfo): Record<string, string> {
    const errs: Record<string, string> = {};
    if (data.full_name.trim().length < 2) errs.full_name = "الاسم الكامل مطلوب";
    // QID: 11 digits; the first digit is 2 or 3. Qatar QID has no public checksum digit.
    if (!/^[23][0-9]{10}$/.test(data.national_id.trim())) errs.national_id = "رقم الهوية القطرية يجب أن يتكون من 11 رقمًا ويبدأ بـ 2 أو 3";
    if (!/^974[0-9]{8}$/.test(data.phone.trim())) errs.phone = "رقم الجوال يجب أن يكون 974 متبوعًا بـ 8 أرقام";
    if (data.address.trim().length < 3) errs.address = "العنوان مطلوب";
    return errs;
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data: ClientInfo = {
      full_name: String(form.full_name.value ?? ""),
      national_id: nationalId,
      phone: phone ? `974${phone}` : "",
      address: String(form.address.value ?? ""),
    };

    const errs = validate(data);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setErrors({});
    setLoading(true);

    // اجلب بيانات الحجز المحفوظة في sessionStorage
    const bookingRaw = typeof window !== "undefined" ? sessionStorage.getItem("maawen_booking") : null;
    let booking = {};
    try {
      booking = bookingRaw ? JSON.parse(bookingRaw) : {};
    } catch {
      booking = {};
    }

    const fingerprint = typeof window !== "undefined" ? getFingerprint() : "ssr";
    const bookingRef = (booking as Record<string, unknown>).bookingRef as string | undefined;

    try {
      const res = await fetch("/api/maawen/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-fingerprint": fingerprint },
        body: JSON.stringify({
          fullName: data.full_name,
          national_id: data.national_id,
          phone: data.phone,
          address: data.address,
          bookingRef,
          booking: booking as Record<string, unknown>,
        }),
      });
      const result = await res.json();
      setLoading(false);
      if (!res.ok) {
        setErrors({ phone: result.error || "حدث خطأ في حفظ البيانات" });
        return;
      }

      // احفظ بيانات العميل ثم انتقل لصفحة الملخص والدفع
      sessionStorage.setItem("maawen_client", JSON.stringify(data));
      const stored = booking as Record<string, unknown>;
      let bookingId = (stored.bookingId as string | undefined) ?? (stored.booking_id as string | undefined);
      let bookingRefValue = bookingRef ?? (result.bookingRef as string | undefined) ?? "";
      let serviceValue = String(stored.service ?? "");
      let totalValue = String(stored.total ?? 0);

      // إذا وصل المستخدم إلى هنا بدون حجز سابق (sessionStorage فارغ — حالة
      // الدخول المباشر إلى /client-info)، ننشئ حجز معاون افتراضياً حتى لا
      // تصل صفحة الملخص بدون bookingId ويبقى زر "ادفع الآن" معطّلاً.
      if (!bookingId) {
        try {
          const bkRes = await fetch("/api/maawen/bookings", {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-fingerprint": fingerprint },
            body: JSON.stringify({
              type: "monthly",
              service: serviceValue || "خدمة معاون",
              contract_duration: 1,
              unit_price: 27,
              workers_count: 1,
              nationality: "",
              date: null,
              total: 27,
              deposit: 27,
              remaining: 0,
            }),
          });
          const bkResult = await bkRes.json();
          if (bkRes.ok && bkResult.bookingId) {
            bookingId = bkResult.bookingId;
            bookingRefValue = bkResult.bookingRef ?? bookingRefValue;
            totalValue = "27";
            // حدّث sessionStorage ليتطابق مع الحجز المنشأ
            sessionStorage.setItem(
              "maawen_booking",
              JSON.stringify({ ...stored, service: serviceValue || "خدمة معاون", total: 27, bookingRef: bookingRefValue, bookingId }),
            );
          }
        } catch {
          // تجاهل — سيبقى بدون bookingId وسيظهر تنبيه في صفحة الملخص.
        }
      }

      const query = new URLSearchParams({
        service: serviceValue,
        total: totalValue,
        ref: bookingRefValue,
      });
      if (bookingId) query.set("bookingId", bookingId);
      router.push(`${prefix}/amount?${query.toString()}`);
    } catch {
      setLoading(false);
      setErrors({ phone: "حدث خطأ في إرسال البيانات" });
    }
  }

  return (
    <form onSubmit={handleSubmit} className={styles.clientFormSpace}>
      <div className={styles.field}>
        <label className={styles.fieldLabel} htmlFor="fullName">اسم العميل</label>
        <input type="text" id="fullName" name="full_name" className={styles.input} placeholder="الاسم الكامل" />
        {errors.full_name && <span style={{ color: "var(--color-danger)", fontSize: 12 }}>{errors.full_name}</span>}
      </div>

      <div className={styles.field}>
        <label className={styles.fieldLabel} htmlFor="fullid">رقم الهوية</label>
        <input
          type="tel"
          id="fullid"
          name="fullid"
          className={styles.input}
          dir="ltr"
          inputMode="numeric"
          autoComplete="off"
          maxLength={11}
          value={nationalId}
          onChange={(e) => setNationalId(toAsciiDigits(e.target.value).slice(0, 11))}
          placeholder="رقم الهوية القطرية"
        />
        {errors.national_id && <span style={{ color: "var(--color-danger)", fontSize: 12 }}>{errors.national_id}</span>}
      </div>

      <div className={styles.field}>
        <label className={styles.fieldLabel} htmlFor="phone">رقم الجوال</label>
        <div className={styles.phoneWrap} dir="ltr">
          <span className={styles.phonePrefix} aria-hidden="true">+974</span>
          <input
            type="tel"
            id="phone"
            name="phone"
            className={styles.phoneInput}
            dir="ltr"
            inputMode="numeric"
            autoComplete="tel-national"
            maxLength={8}
            value={phone}
            onChange={(e) => setPhone(toAsciiDigits(e.target.value).slice(0, 8))}
            placeholder="XXXXXXXX"
            pattern="[0-9]{8}"
            aria-label="رقم الجوال المحلي بعد رمز الدولة +974"
          />
        </div>
        {errors.phone && <span style={{ color: "var(--color-danger)", fontSize: 12 }}>{errors.phone}</span>}
      </div>

      <div className={styles.field}>
        <label className={styles.fieldLabel} htmlFor="address">العنوان</label>
        <input type="text" id="address" name="address" className={styles.input} placeholder="المنطقة، الشارع، رقم المبنى" />
        {errors.address && <span style={{ color: "var(--color-danger)", fontSize: 12 }}>{errors.address}</span>}
      </div>

      <button type="submit" className={styles.btnPrimary} disabled={loading}>
        {loading ? "جارٍ الحفظ..." : "متابعة"}
      </button>

      <div style={{ textAlign: "center", paddingTop: 16 }}>
        <a href="/" className={styles.backLink}>العودة للرئيسية</a>
      </div>
    </form>
  );
}