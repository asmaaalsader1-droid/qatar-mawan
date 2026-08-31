"use client";

import Link from "next/link";
import { Card } from "@/components/ui/Card";
import styles from "./DashboardClient.module.css";

type Stats = {
  workersCount: number;
  bookingsCount: number;
  pendingBookings: number;
  todayVisitors: number;
};

type RecentBooking = {
  id: string;
  booking_ref: string;
  status: string;
  created_at: string;
  workers?: { full_name: string; photo_url: string } | { full_name: string; photo_url: string }[] | null;
};

export function DashboardClient({
  stats,
  recentBookings,
}: {
  stats: Stats;
  recentBookings: RecentBooking[];
}) {
  const cards = [
    { label: "إجمالي العاملات", value: stats.workersCount, icon: "👤", color: "#3b82f6" },
    { label: "إجمالي الحجوزات", value: stats.bookingsCount, icon: "📅", color: "#8b5cf6" },
    { label: "حجوزات معلقة", value: stats.pendingBookings, icon: "⏳", color: "#f59e0b" },
    { label: "زوار اليوم", value: stats.todayVisitors, icon: "👥", color: "#10b981" },
  ];

  return (
    <div>
      <h1 className={styles.title}>لوحة التحكم</h1>
      <div className={styles.statsGrid}>
        {cards.map((card) => (
          <Card key={card.label} className={styles.statCard}>
            <span className={styles.statIcon} style={{ background: card.color + "20", color: card.color }}>
              {card.icon}
            </span>
            <div>
              <div className={styles.statValue}>{card.value}</div>
              <div className={styles.statLabel}>{card.label}</div>
            </div>
          </Card>
        ))}
      </div>

      <h2 className={styles.sectionTitle}>أحدث الحجوزات</h2>
      {recentBookings.length === 0 ? (
        <Card>
          <p className={styles.empty}>لا توجد حجوزات بعد.</p>
        </Card>
      ) : (
        <Card className={styles.tableCard}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>المرجع</th>
                <th>العاملة</th>
                <th>الحالة</th>
                <th>التاريخ</th>
                <th>إجراء</th>
              </tr>
            </thead>
            <tbody>
              {recentBookings.map((b) => (
                <tr key={b.id}>
                  <td className={styles.refCell}>{b.booking_ref}</td>
                  <td>{(Array.isArray(b.workers) ? b.workers[0] : b.workers)?.full_name ?? "—"}</td>
                  <td>
                    <span className={styles.statusBadge} data-status={b.status}>
                      {b.status}
                    </span>
                  </td>
                  <td>{new Date(b.created_at).toLocaleDateString("ar-QA")}</td>
                  <td>
                    <Link href={`/admin/bookings`} className={styles.viewBtn}>
                      عرض
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
