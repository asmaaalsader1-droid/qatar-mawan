"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Dictionary } from "@/lib/i18n";
import type { Booking, Worker } from "@/lib/supabase/types";
import type { User } from "@supabase/supabase-js";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatWorkerPrice } from "@/lib/pricing";
import { CandidateImage } from "./CandidateImage";
import styles from "./AccountClient.module.css";

export function AccountClient({
  user,
  bookings,
  dict,
  locale,
}: {
  user: User;
  bookings: (Booking & { workers: Worker | null })[];
  dict: Dictionary;
  locale: string;
}) {
  const router = useRouter();
  const prefix = `/${locale}`;

  async function logout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push(prefix);
    router.refresh();
  }

  return (
    <div className="container">
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>{dict.account.title}</h1>
          <p className={styles.email}>{user.email}</p>
        </div>
        <Button variant="outline" onClick={logout}>
          {dict.account.logout}
        </Button>
      </div>

      <h2 className={styles.sectionTitle}>{dict.account.bookings}</h2>
      {bookings.length === 0 ? (
        <Card className={styles.empty}>
          <p>{dict.account.noBookings}</p>
          <Button href={`${prefix}/candidates`}>{dict.account.browse}</Button>
        </Card>
      ) : (
        <div className={styles.bookingsList}>
          {bookings.map((b) => (
            <Card key={b.id} className={styles.bookingRow}>
              {b.workers && <CandidateImage worker={b.workers} locale={locale as "ar" | "en"} className={styles.bookingImg} />}
              <div className={styles.bookingInfo}>
                <h3>{b.workers?.full_name}</h3>
                <p className={styles.bookingRef}>{b.booking_ref}</p>
                <p className={styles.bookingSalary}>
                  {b.workers ? formatWorkerPrice(b.workers, locale) : ""}
                </p>
              </div>
              <div className={styles.bookingStatus}>
                <Badge variant={b.status === "pending" ? "pending" : b.status === "confirmed" ? "confirmed" : "booked"}>
                  {b.status}
                </Badge>
                <Button href={`${prefix}/checkout/${b.id}`} size="sm" variant="outline">
                  {dict.common.viewDetails}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
