import { NextResponse } from "next/server";
import { createServiceClient, createClient } from "@/lib/supabase/server";
import { getPageLabel } from "@/lib/page-labels";

async function requireAdmin() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: setting } = await supabase
    .from("settings")
    .select("value")
    .eq("key", "admin_email")
    .maybeSingle();
  const adminEmail = (setting?.value as { email?: string })?.email;
  if (adminEmail && user.email === adminEmail) return user;
  return null;
}

// تحويل رمز الدولة إلى علم إيموجي
function countryToFlag(code: string | null): string {
  if (!code || code.length !== 2) return "🌐";
  const cc = code.toUpperCase();
  const codePoints = Array.from(cc).map(
    (c) => 0x1f1e6 + (c.charCodeAt(0) - 65),
  );
  return String.fromCodePoint(...codePoints);
}

function activityLabel(type: string): string {
  switch (type) {
    case "booking": return "حجز عاملة";
    case "inquiry": return "استفسار";
    case "payment": return "دفع";
    case "verification": return "تحقق";
    default: return "زيارة";
  }
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "الآن";
  if (min < 60) return `منذ ${min} د`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `منذ ${hr} س`;
  const day = Math.floor(hr / 24);
  if (day === 1) return "منذ يوم";
  if (day === 2) return "منذ يومين";
  if (day < 11) return `منذ ${day} أيام`;
  return `منذ ${Math.floor(day / 7)} أسابيع`;
}

export type BookingInfo = {
  id: string;
  booking_ref: string;
  status: string;
  notes: string | null;
  terms_snapshot: string | null;
  return_policy_snapshot: string | null;
  created_at: string;
  worker: { full_name: string; nationality: string; photo_url: string | null; expected_salary: number; employment_type: string[] } | null;
};

export type EntryInfo = {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  created_at: string;
};

export type InboxClient = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  country: string | null;
  flag: string;
  fingerprint: string;
  ip: string | null;
  is_blocked: boolean;
  created_at: string;
  timeAgo: string;
  lastActivity: string;
  lastType: string | null;
  lastPath: string | null;
  lastPageLabel: string | null;
  active: boolean;
  initials: string;
  bookings: BookingInfo[];
  entries: EntryInfo[];
};

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  const supabase = createServiceClient();

  const { data: clients, error: cErr } = await supabase
    .from("clients")
    .select("id, name, email, phone, country, fingerprint, ip, is_blocked, created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  if (cErr) {
    return NextResponse.json({ error: cErr.message }, { status: 500 });
  }

  const clientIds = (clients ?? []).map((c) => c.id).filter(Boolean);

  // جلب الحجوزات + العاملة لكل عميل
  const { data: bookings } = await supabase
    .from("bookings")
    .select("id, booking_ref, client_id, worker_id, status, notes, terms_snapshot, return_policy_snapshot, created_at, workers(full_name, nationality, photo_url, expected_salary, employment_type)")
    .in("client_id", clientIds)
    .order("created_at", { ascending: false });

  // جلب كل إدخالات العميل
  const { data: entries } = await supabase
    .from("client_data_entries")
    .select("id, client_id, type, payload, created_at")
    .in("client_id", clientIds)
    .order("created_at", { ascending: false })
    .limit(200);

  // تجميع الحجوزات والإدخالات حسب client_id
  const bookingsByClient = new Map<string, BookingInfo[]>();
  for (const b of bookings ?? []) {
    if (!b.client_id) continue;
    const list = bookingsByClient.get(b.client_id) ?? [];
    list.push({
      id: b.id,
      booking_ref: b.booking_ref,
      status: b.status,
      notes: b.notes,
      terms_snapshot: b.terms_snapshot,
      return_policy_snapshot: b.return_policy_snapshot,
      created_at: b.created_at,
      worker: Array.isArray(b.workers) ? (b.workers[0] as BookingInfo["worker"]) : (b.workers as BookingInfo["worker"]),
    });
    bookingsByClient.set(b.client_id, list);
  }

  const entriesByClient = new Map<string, EntryInfo[]>();
  const latestEntry = new Map<string, { type: string; created_at: string }>();
  const presencePathByClient = new Map<string, string | null>();
  for (const e of entries ?? []) {
    if (!e.client_id) continue;
    const list = entriesByClient.get(e.client_id) ?? [];
    list.push({
      id: e.id,
      type: e.type,
      payload: e.payload as Record<string, unknown>,
      created_at: e.created_at,
    });
    entriesByClient.set(e.client_id, list);
    if (!latestEntry.has(e.client_id)) {
      latestEntry.set(e.client_id, { type: e.type, created_at: e.created_at });
    }
    // آخر صفحة معروفة للعميل (من إدخال presence)
    if (e.type === "presence" && !presencePathByClient.has(e.client_id)) {
      const p = (e.payload as { path?: string }) ?? {};
      presencePathByClient.set(e.client_id, p.path ?? null);
    }
  }

  const enriched: InboxClient[] = (clients ?? []).map((c) => {
    const entry = c.id ? latestEntry.get(c.id) : undefined;
    const name = c.name || (c.email ? c.email.split("@")[0] : "زائر");
    const initials = name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w: string) => w[0])
      .join("")
      .toUpperCase();
    const lastType = entry?.type ?? null;
    // آخر نشاط = أحدث وقت بين: إنشاء الحساب، آخر إدخال، آخر حجز
    const clientBookings = c.id ? (bookingsByClient.get(c.id) ?? []) : [];
    const latestBookingDate = clientBookings.length > 0 ? clientBookings[0].created_at : null;
    const lastDate = [c.created_at, entry?.created_at ?? null, latestBookingDate]
      .filter(Boolean)
      .sort((a, b) => new Date(b as string).getTime() - new Date(a as string).getTime())[0] ?? c.created_at;

    const lastPath = c.id ? (presencePathByClient.get(c.id) ?? null) : null;
    return {
      id: c.id,
      name,
      email: c.email,
      phone: c.phone,
      country: c.country,
      flag: countryToFlag(c.country),
      fingerprint: c.fingerprint,
      ip: c.ip,
      is_blocked: c.is_blocked,
      created_at: c.created_at,
      timeAgo: timeAgo(lastDate),
      lastActivity: lastType ? activityLabel(lastType) : "زيارة جديدة",
      lastType,
      lastPath,
      lastPageLabel: lastPath ? getPageLabel(lastPath) : null,
      active: !!entry,
      initials: initials || "؟",
      bookings: clientBookings,
      entries: c.id ? (entriesByClient.get(c.id) ?? []) : [],
    };
  });

  // ترتيب العملاء حسب آخر نشاط (الأحدث في الأعلى)
  enriched.sort((a, b) => {
    const firstEntryTime = (c: InboxClient) => {
      const e = c.entries[0] as { created_at?: string } | undefined;
      const b = c.bookings[0] as { created_at?: string } | undefined;
      return new Date(e?.created_at ?? b?.created_at ?? c.created_at).getTime();
    };
    return firstEntryTime(b) - firstEntryTime(a);
  });

  return NextResponse.json({ clients: enriched, total: enriched.length });
}

