"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { createClient } from "@/lib/supabase/client";
import styles from "./PresenceClient.module.css";

type Stats = {
  todayVisitors: number;
  totalVisitors: number;
  totalBookings: number;
  todayBookings: number;
};

export function PresenceClient({
  stats: initial,
  byDate,
}: {
  stats: Stats;
  byDate: Record<string, number>;
}) {
  const [stats, setStats] = useState(initial);
  const [live, setLive] = useState<Record<string, number>>(byDate);

  useEffect(() => {
    // Subscribe to changes for live updates.
    const supabase = createClient();
    const refresh = async () => {
      const today = new Date().toISOString().slice(0, 10);
      const [{ count: tv }, { count: tt }, { count: tb }, { count: tbk }] = await Promise.all([
        supabase.from("daily_visitors").select("*", { count: "exact", head: true }).eq("date", today),
        supabase.from("daily_visitors").select("*", { count: "exact", head: true }),
        supabase.from("bookings").select("*", { count: "exact", head: true }),
        supabase.from("bookings").select("*", { count: "exact", head: true }).gte("created_at", today),
      ]);
      setStats({
        todayVisitors: tv ?? 0,
        totalVisitors: tt ?? 0,
        totalBookings: tbk ?? 0,
        todayBookings: tb ?? 0,
      });
    };

    const channel = supabase
      .channel("presence-updates")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "daily_visitors" }, refresh)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "bookings" }, refresh)
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, []);

  const dates = Object.keys(live).sort();
  const max = Math.max(...Object.values(live), 1);

  const cards = [
    { label: "زوار اليوم", value: stats.todayVisitors, icon: "👥", color: "#10b981" },
    { label: "إجمالي الزوار", value: stats.totalVisitors, icon: "🌍", color: "#3b82f6" },
    { label: "حجوزات اليوم", value: stats.todayBookings, icon: "📅", color: "#f59e0b" },
    { label: "إجمالي الحجوزات", value: stats.totalBookings, icon: "✅", color: "#8b5cf6" },
  ];

  return (
    <div>
      <h1 className={styles.title}>الحضور والنشاط</h1>
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

      <h2 className={styles.sectionTitle}>آخر 7 أيام</h2>
      <Card className={styles.chart}>
        {dates.length === 0 ? (
          <p className={styles.empty}>لا توجد بيانات كافية بعد.</p>
        ) : (
          <div className={styles.bars}>
            {dates.map((date) => (
              <div key={date} className={styles.barItem}>
                <div className={styles.barTrack}>
                  <div
                    className={styles.bar}
                    style={{ height: `${(live[date] / max) * 100}%` }}
                    title={`${live[date]} زائر`}
                  />
                </div>
                <span className={styles.barLabel}>{date.slice(5)}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
