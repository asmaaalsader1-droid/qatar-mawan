import { createClient } from "@/lib/supabase/server";
import { PresenceClient } from "@/components/admin/PresenceClient";

export default async function PresencePage() {
  const supabase = createClient();
  const today = new Date().toISOString().slice(0, 10);

  const [{ count: todayVisitors }, { count: totalVisitors }, { count: totalBookings }, { count: todayBookings }] =
    await Promise.all([
      supabase
        .from("daily_visitors")
        .select("*", { count: "exact", head: true })
        .eq("date", today),
      supabase.from("daily_visitors").select("*", { count: "exact", head: true }),
      supabase.from("bookings").select("*", { count: "exact", head: true }),
      supabase
        .from("bookings")
        .select("*", { count: "exact", head: true })
        .gte("created_at", today),
    ]);

  // Last 7 days.
  const sevenAgo = new Date();
  sevenAgo.setDate(sevenAgo.getDate() - 7);
  const { data: daily } = await supabase
    .from("daily_visitors")
    .select("date")
    .gte("date", sevenAgo.toISOString().slice(0, 10))
    .order("date", { ascending: true });

  // Count by date.
  const byDate: Record<string, number> = {};
  daily?.forEach((row) => {
    byDate[row.date] = (byDate[row.date] || 0) + 1;
  });

  return (
    <PresenceClient
      stats={{
        todayVisitors: todayVisitors ?? 0,
        totalVisitors: totalVisitors ?? 0,
        totalBookings: totalBookings ?? 0,
        todayBookings: todayBookings ?? 0,
      }}
      byDate={byDate}
    />
  );
}
