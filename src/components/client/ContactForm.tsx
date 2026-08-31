"use client";

import { useState } from "react";
import { Field, Input, Textarea, Select } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { Dictionary } from "@/lib/i18n";
import styles from "./ContactForm.module.css";

export function ContactForm({ dict, locale = "ar" }: { dict: Dictionary; locale?: string }) {
  const toast = useToast();
  const isAr = locale === "ar";
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [refNo, setRefNo] = useState<string | null>(null);

  function validateField(name: string, value: string): string {
    const v = value.trim();
    if (!v) return isAr ? "هذا الحقل مطلوب" : "This field is required";
    if (name === "email") {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return isAr ? "صيغة البريد الإلكتروني غير صحيحة" : "Invalid email format";
    }
    if (name === "phone") {
      if (!/^[+]?[\d\s-]{6,}$/.test(v)) return isAr ? "أدخل رقم هاتف صحيحًا" : "Enter a valid phone number";
    }
    if (name === "message") {
      if (v.length < 5) return isAr ? "الرسالة قصيرة جداً" : "Message is too short";
    }
    return "";
  }

  function validateAll(data: Record<string, string>): Record<string, string> {
    const errs: Record<string, string> = {};
    (["full_name", "phone", "email", "service_type", "message"] as const).forEach((f) => {
      const e = validateField(f, data[f] ?? "");
      if (e) errs[f] = e;
    });
    return errs;
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrors({});
    setRefNo(null);

    const form = e.currentTarget;
    const data = new FormData(form);
    const payload = {
      full_name: String(data.get("full_name") ?? ""),
      phone: String(data.get("phone") ?? ""),
      email: String(data.get("email") ?? ""),
      service_type: String(data.get("service_type") ?? ""),
      message: String(data.get("message") ?? ""),
    };

    const errs = validateAll(payload);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await res.json();
      setLoading(false);

      if (!res.ok) {
        if (result.errors) {
          setErrors(result.errors);
        } else {
          toast.push(result.error || dict.common.error, "error");
        }
        return;
      }

      toast.push(dict.contact.sent, "success");
      setRefNo(result.refNo);
      form.reset();
    } catch {
      setLoading(false);
      toast.push(dict.common.error, "error");
    }
  }

  const serviceOpts = isAr
    ? [
        { value: "full-time-live-in", label: "إقامة كاملة" },
        { value: "housemaids", label: "عاملات منزليات" },
        { value: "training", label: "تدريب" },
        { value: "recruitment", label: "توظيف وتعيين" },
      ]
    : [
        { value: "full-time-live-in", label: "Full-time live-in" },
        { value: "housemaids", label: "Housemaids" },
        { value: "training", label: "Training" },
        { value: "recruitment", label: "Recruitment & hiring" },
      ];

  return (
    <form onSubmit={onSubmit} className={styles.form} noValidate>
      <div className={styles.row}>
        <Field label={dict.contact.fullName} error={errors.full_name} htmlFor="cf_full_name">
          <Input
            id="cf_full_name"
            name="full_name"
            required
            autoComplete="name"
            placeholder={dict.contact.fullName}
            aria-describedby={errors.full_name ? "cf_full_name_err" : undefined}
            aria-invalid={!!errors.full_name}
          />
          {errors.full_name && <span id="cf_full_name_err" className={styles.srOnly}>{errors.full_name}</span>}
        </Field>
        <Field label={dict.contact.phone} error={errors.phone} htmlFor="cf_phone">
          <Input
            id="cf_phone"
            name="phone"
            type="tel"
            required
            autoComplete="tel"
            placeholder="+974..."
            dir="ltr"
            aria-describedby={errors.phone ? "cf_phone_err" : undefined}
            aria-invalid={!!errors.phone}
          />
          {errors.phone && <span id="cf_phone_err" className={styles.srOnly}>{errors.phone}</span>}
        </Field>
      </div>
      <div className={styles.row}>
        <Field label={dict.contact.email} error={errors.email} htmlFor="cf_email">
          <Input
            id="cf_email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="example@mail.com"
            dir="ltr"
            aria-describedby={errors.email ? "cf_email_err" : undefined}
            aria-invalid={!!errors.email}
          />
          {errors.email && <span id="cf_email_err" className={styles.srOnly}>{errors.email}</span>}
        </Field>
        <Field label={dict.contact.serviceType} error={errors.service_type} htmlFor="cf_service">
          <Select
            id="cf_service"
            name="service_type"
            required
            defaultValue=""
            aria-describedby={errors.service_type ? "cf_service_err" : undefined}
            aria-invalid={!!errors.service_type}
          >
            <option value="" disabled>—</option>
            {serviceOpts.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </Select>
          {errors.service_type && <span id="cf_service_err" className={styles.srOnly}>{errors.service_type}</span>}
        </Field>
      </div>
      <Field label={dict.contact.message} error={errors.message} htmlFor="cf_message">
        <Textarea
          id="cf_message"
          name="message"
          required
          placeholder={dict.contact.message}
          aria-describedby={errors.message ? "cf_message_err" : undefined}
          aria-invalid={!!errors.message}
        />
        {errors.message && <span id="cf_message_err" className={styles.srOnly}>{errors.message}</span>}
      </Field>
      <div className={styles.actions}>
        <Button type="submit" disabled={loading}>
          {loading ? dict.common.loading : dict.contact.send}
        </Button>
        {refNo && (
          <span className={styles.refNo}>
            {dict.contact.refNo}: <strong>{refNo}</strong>
          </span>
        )}
      </div>
    </form>
  );
}
