"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Field, Input, Select } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { Dictionary } from "@/lib/i18n";
import { Worker, salaryPeriod } from "@/lib/supabase/types";
import { getFingerprint } from "@/lib/presence";
import styles from "./BookingForm.module.css";

type DurationOption = { value: number; label: string };

function durationOptions(
  unit: "hours" | "months" | "years",
  dict: Dictionary,
): DurationOption[] {
  const b = dict.book;
  if (unit === "hours") {
    return [2, 3, 4, 5, 6, 7, 8].map((n) => ({
      value: n,
      label: `${n} ${n === 2 ? b.hour : b.hours}`,
    }));
  }
  if (unit === "months") {
    return [1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => ({
      value: n,
      label: `${n} ${n === 1 ? b.month : b.months}`,
    }));
  }
  return [1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => ({
    value: n,
    label: `${n} ${n === 1 ? b.year : b.years}`,
  }));
}

export function BookingForm({
  worker,
  dict,
  locale,
}: {
  worker: Worker;
  dict: Dictionary;
  locale: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const period = salaryPeriod(worker.employment_type);
  const durationUnit: "hours" | "months" | "years" | null =
    period === "hourly" ? "hours" : period === "monthly" ? "months" : period === "yearly" ? "years" : null;
  const options = durationUnit ? durationOptions(durationUnit, dict) : [];

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setErrors({});

    const form = e.currentTarget;
    const data = new FormData(form);
    const payload: Record<string, unknown> = {
      full_name: String(data.get("full_name") ?? ""),
      national_id: String(data.get("national_id") ?? ""),
      phone: String(data.get("phone") ?? ""),
      home_address: String(data.get("home_address") ?? ""),
      candidateId: worker.id,
    };
    if (durationUnit) {
      const dur = data.get("duration");
      payload.duration = dur ? Number(dur) : undefined;
      payload.duration_unit = durationUnit;
    }

    const fingerprint = typeof window !== "undefined" ? getFingerprint() : "ssr";

    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-fingerprint": fingerprint,
        },
        body: JSON.stringify(payload),
      });
      const result = await res.json().catch(() => ({}));
      setLoading(false);

      if (!res.ok) {
        if (result.errors) {
          setErrors(result.errors);
        } else {
          toast.push(result.error || dict.common.error, "error");
        }
        return;
      }

      toast.push(`${dict.book.bookingCreated} ${result.bookingRef}`, "success");
      router.push(`/${locale}/checkout/${result.bookingId}`);
    } catch {
      setLoading(false);
      toast.push(dict.common.error, "error");
    }
  }

  return (
    <form onSubmit={onSubmit} className={styles.form} noValidate>
      <Field label={dict.book.fullName} error={errors.full_name}>
        <Input name="full_name" required placeholder={dict.book.fullName} />
      </Field>
      <Field label={dict.book.nationalId} error={errors.national_id}>
        <Input name="national_id" required dir="ltr" style={{ textAlign: "start" }} placeholder={dict.book.nationalId} />
      </Field>
      <Field label={dict.book.phone} error={errors.phone}>
        <Input name="phone" type="tel" required dir="ltr" style={{ textAlign: "start" }} placeholder="+974..." />
      </Field>
      <Field label={dict.book.homeAddress} error={errors.home_address}>
        <Input name="home_address" required placeholder={dict.book.homeAddress} />
      </Field>
      {durationUnit && options.length > 0 && (
        <Field label={dict.book.duration} error={errors.duration}>
          <Select name="duration" required defaultValue="">
            <option value="" disabled>
              {durationUnit === "hours"
                ? dict.book.selectHours
                : durationUnit === "months"
                  ? dict.book.selectMonths
                  : dict.book.selectYears}
            </option>
            {options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </Field>
      )}
      <input type="hidden" name="candidateId" value={worker.id} />
      <p className={styles.notice}>{dict.book.termsNotice}</p>
      <Button type="submit" size="lg" disabled={loading}>
        {loading ? dict.common.loading : dict.book.complete}
      </Button>
    </form>
  );
}
