"use client";

import { useState } from "react";
import Link from "next/link";
import { Dictionary } from "@/lib/i18n";
import { Checkbox } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { formatSalary } from "@/lib/utils";
import { formatWorkerPrice } from "@/lib/pricing";
import { CandidateImage } from "./CandidateImage";
import type { Booking, Worker } from "@/lib/supabase/types";
import styles from "./CheckoutClient.module.css";

export function CheckoutClient({
  booking,
  amount,
  duration,
  durationUnit,
  dict,
  locale,
}: {
  booking: Booking & { workers: Worker };
  amount: number;
  duration?: number;
  durationUnit?: "hours" | "months" | "years";
  dict: Dictionary;
  locale: string;
}) {
  const [agreed, setAgreed] = useState(false);
  const prefix = `/${locale}`;
  const isAr = locale === "ar";

  const unitLabel =
    durationUnit === "hours" ? (isAr ? "ساعة" : "hours")
      : durationUnit === "months" ? (isAr ? "شهر" : "months")
      : durationUnit === "years" ? (isAr ? "سنة" : "years")
      : "";

  return (
    <div className={styles.layout}>
      <Card className={styles.summary}>
        <h2 className={styles.sectionTitle}>{dict.checkout.summary}</h2>
        <div className={styles.row}>
          <span>{dict.payment.bookingRef}</span>
          <strong>{booking.booking_ref}</strong>
        </div>
        <div className={styles.row}>
          <span>{isAr ? "الحالة" : "Status"}</span>
          <strong>{booking.status}</strong>
        </div>
        <div className={styles.workerCard}>
          <CandidateImage worker={booking.workers} locale={locale as "ar" | "en"} className={styles.workerImg} />
          <div>
            <h3>{booking.workers.full_name}</h3>
            <p>{booking.workers.nationality} · {booking.workers.experience_years} {isAr ? "سنة" : "yrs"}</p>
            <p className={styles.salary}>{formatWorkerPrice(booking.workers, locale)}</p>
            {duration ? (
              <p className={styles.salary}>
                {isAr ? "المدة" : "Duration"}: {duration} {unitLabel}
              </p>
            ) : null}
          </div>
        </div>
        <div className={styles.row}>
          <span>{dict.payment.total}</span>
          <strong>{formatSalary(amount, locale)}</strong>
        </div>
      </Card>

      <Card className={styles.terms}>
        <h3>{isAr ? "الشروط" : "Terms"}</h3>
        <p>{booking.terms_snapshot || "—"}</p>
        <h3>{isAr ? "سياسة الاسترجاع" : "Return policy"}</h3>
        <p>{booking.return_policy_snapshot || "—"}</p>
      </Card>

      <Card className={styles.actions}>
        <Checkbox
          checked={agreed}
          onChange={(e) => setAgreed((e.target as HTMLInputElement).checked)}
          label={dict.checkout.agreeTerms}
        />
        <Button href={`${prefix}/payment/${booking.id}`} disabled={!agreed} size="lg">
          {dict.checkout.proceedPayment}
        </Button>
      </Card>
    </div>
  );
}
