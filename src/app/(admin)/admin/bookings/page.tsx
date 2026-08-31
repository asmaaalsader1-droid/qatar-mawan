import { createClient } from "@/lib/supabase/server";
import { BookingsAdminClient } from "@/components/admin/BookingsAdminClient";
import type { BookingEntryPayload } from "@/components/admin/BookingsAdminClient";

export default async function AdminBookingsPage() {
  const supabase = createClient();
  const { data: bookings } = await supabase
    .from("bookings")
    .select("*, workers(*), clients(name, email, phone, fingerprint, ip)")
    .order("created_at", { ascending: false });

  // اجلب أحدث إدخال بيانات (نوع booking) لكل حجز لعرض تفاصيل النموذج
  // (رقم الهوية، العنوان، المدة) المخزّنة في payload.
  const entryByBooking: Record<string, BookingEntryPayload> = {};
  if (bookings && bookings.length > 0) {
    const bookingIds = bookings.map((b) => b.id);
    const { data: entries } = await supabase
      .from("client_data_entries")
      .select("payload, created_at")
      .eq("type", "booking")
      .order("created_at", { ascending: false });
    if (entries) {
      for (const e of entries) {
        const p = (e.payload as Record<string, unknown>) ?? {};
        const bid = String(p.bookingId ?? p.booking_id ?? "");
        if (bid && bookingIds.includes(bid) && !entryByBooking[bid]) {
          entryByBooking[bid] = p as unknown as BookingEntryPayload;
        }
      }
    }
  }

  return <BookingsAdminClient bookings={bookings ?? []} entryByBooking={entryByBooking} />;
}
