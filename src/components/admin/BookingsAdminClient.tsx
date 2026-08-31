"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import type { Booking, Worker } from "@/lib/supabase/types";
import styles from "./BookingsAdminClient.module.css";

type ClientInfo = {
  name: string | null;
  email: string | null;
  phone: string | null;
  fingerprint: string | null;
  ip: string | null;
} | null;

export type BookingEntryPayload = {
  full_name?: string;
  national_id?: string;
  phone?: string;
  home_address?: string;
  duration?: number;
  duration_unit?: "hours" | "months" | "years";
  bookingRef?: string;
  bookingId?: string;
};

type BookingWithRels = Booking & {
  workers: Worker | null;
  clients: ClientInfo;
};

const DURATION_UNIT_AR: Record<string, string> = {
  hours: "ساعة",
  months: "شهر",
  years: "سنة",
};

export function BookingsAdminClient({
  bookings,
  entryByBooking = {},
}: {
  bookings: BookingWithRels[];
  entryByBooking?: Record<string, BookingEntryPayload>;
}) {
  const toast = useToast();
  const [selected, setSelected] = useState<BookingWithRels | null>(null);

  async function updateStatus(id: string, status: string) {
    const res = await fetch(`/api/admin/bookings/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      toast.push("تم تحديث الحالة", "success");
      window.location.reload();
    } else {
      toast.push("فشل", "error");
    }
  }

  return (
    <div>
      <h1 className={styles.title}>الحجوزات ({bookings.length})</h1>
      <Card className={styles.tableCard}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>المرجع</th>
              <th>العاملة</th>
              <th>العميل</th>
              <th>الهاتف</th>
              <th>الحالة</th>
              <th>التاريخ</th>
              <th>إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {bookings.map((b) => (
              <tr key={b.id}>
                <td className={styles.refCell}>{b.booking_ref}</td>
                <td>{b.workers?.full_name ?? "—"}</td>
                <td>{b.clients?.name ?? b.clients?.email ?? "زائر"}</td>
                <td>{b.clients?.phone ?? "—"}</td>
                <td>
                  <span className={styles.statusBadge} data-status={b.status}>{b.status}</span>
                </td>
                <td>{new Date(b.created_at).toLocaleDateString("ar-QA")}</td>
                <td>
                  <button className={styles.viewBtn} onClick={() => setSelected(b)}>عرض</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Modal open={!!selected} onClose={() => setSelected(null)} title={selected?.booking_ref ?? ""} size="lg">
        {selected && (
          <div className={styles.detail}>
            <div className={styles.detailRow}>
              <img src={selected.workers?.photo_url} alt={selected.workers?.full_name} className={styles.detailImg} />
              <div>
                <h3>{selected.workers?.full_name}</h3>
                <p>{selected.workers?.nationality}</p>
              </div>
            </div>
            <div className={styles.infoGrid}>
              <div><strong>العميل:</strong> {selected.clients?.name ?? "زائر"}</div>
              <div><strong>رقم الهوية:</strong> {entryByBooking[selected.id]?.national_id ?? "—"}</div>
              <div><strong>الهاتف:</strong> {selected.clients?.phone ?? "—"}</div>
              <div><strong>عنوان المنزل:</strong> {entryByBooking[selected.id]?.home_address ?? "—"}</div>
              <div>
                <strong>المدة:</strong>{" "}
                {entryByBooking[selected.id]?.duration
                  ? `${entryByBooking[selected.id]!.duration} ${
                      DURATION_UNIT_AR[entryByBooking[selected.id]!.duration_unit ?? ""] ?? ""
                    }`
                  : "—"}
              </div>
              <div><strong>IP:</strong> {selected.clients?.ip ?? "—"}</div>
              <div><strong>Fingerprint:</strong> {selected.clients?.fingerprint?.slice(0, 16)}…</div>
            </div>
            <div className={styles.statusActions}>
              <h4>تغيير الحالة:</h4>
              <div className={styles.statusBtns}>
                {["pending", "confirmed", "completed", "cancelled"].map((s) => (
                  <button
                    key={s}
                    className={`${styles.statusAction} ${selected.status === s ? styles.statusActive : ""}`}
                    onClick={() => updateStatus(selected.id, s)}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
