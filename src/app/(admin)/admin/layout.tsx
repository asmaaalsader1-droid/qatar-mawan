import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { CUSTOMER_ENTRY_TYPES } from "@/lib/customer-types";
import styles from "./layout.module.css";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/ar/login");

  // Check admin role.
  const { data: setting } = await supabase
    .from("settings")
    .select("value")
    .eq("key", "admin_email")
    .maybeSingle();
  const adminEmail = (setting?.value as { email?: string })?.email;
  if (!adminEmail || user.email !== adminEmail) {
    redirect("/ar/blocked");
  }

  const today = new Date().toISOString().slice(0, 10);
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [
    { count: todayVisitors },
    { count: weekVisitors },
    { count: totalVisitors },
    { count: bookingsCount },
    { count: pendingBookings },
    { count: paidBookings },
    { count: inquiriesCount },
    { count: maawenCount },
    { count: clientsCount },
    { data: customerRows },
  ] = await Promise.all([
    supabase.from("daily_visitors").select("*", { count: "exact", head: true }).eq("date", today),
    supabase.from("daily_visitors").select("*", { count: "exact", head: true }).gte("date", weekAgo),
    supabase.from("daily_visitors").select("*", { count: "exact", head: true }),
    supabase.from("bookings").select("*", { count: "exact", head: true }),
    supabase.from("bookings").select("*", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("bookings").select("*", { count: "exact", head: true }).eq("status", "paid"),
    supabase.from("client_data_entries").select("*", { count: "exact", head: true }).eq("type", "inquiry"),
    supabase.from("client_data_entries").select("*", { count: "exact", head: true }).in("type", ["maawen_booking", "maawen_profile", "maawen_payment"]),
    supabase.from("clients").select("*", { count: "exact", head: true }),
    supabase
      .from("client_data_entries")
      .select("client_id, created_at")
      .in("type", [...CUSTOMER_ENTRY_TYPES]),
  ]);

  // "العملاء" = من تفاعل فعلاً (حجز/تسجيل/دفع/استفسار/دخول معاون) وليس مجرد تصفّح.
  // زائر عادي يتنقل بين الصفحات (حضور فقط) لا يُحتسب ضمن الأعداد الحيّة هذه.
  const realCustomerIds = new Set<string>();
  const activeTodayIds = new Set<string>();
  for (const r of customerRows ?? []) {
    if (!r.client_id) continue;
    realCustomerIds.add(r.client_id);
    if (new Date(r.created_at).getTime() >= startOfToday.getTime()) {
      activeTodayIds.add(r.client_id);
    }
  }
  const totalCustomers = realCustomerIds.size;
  const activeToday = activeTodayIds.size;

  return (
    <div className={styles.layout} dir="rtl">
      <AdminSidebar
        stats={{
          todayVisitors: todayVisitors ?? 0,
          weekVisitors: weekVisitors ?? 0,
          totalVisitors: totalVisitors ?? 0,
          activeToday,
          totalCustomers,
          bookingsCount: bookingsCount ?? 0,
          paidBookings: paidBookings ?? 0,
          pendingBookings: pendingBookings ?? 0,
          inquiriesCount: inquiriesCount ?? 0,
          maawenCount: maawenCount ?? 0,
          clientsCount: clientsCount ?? 0,
          adminEmail: user.email ?? adminEmail,
        }}
      />
      <main className={styles.main}>{children}</main>
    </div>
  );
}
