import { createClient } from "@/lib/supabase/server";
import { AdminInboxView } from "@/components/admin/AdminInboxView";
import type { InboxClient } from "@/components/admin/ClientInboxClient";
import { getArchivedClientIds } from "@/lib/archive";
import { countryNameAr, DEVICE_LABELS } from "@/lib/client-info";
import { getPageLabel } from "@/lib/page-labels";
import { isCustomerEntryType } from "@/lib/customer-types";

const PAGE_SIZE = 50;
const FETCH_BATCH_SIZE = 1000;

type ClientRow = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  country: string | null;
  fingerprint: string;
  ip: string | null;
  is_blocked: boolean;
  created_at: string;
};

type BookingRow = {
  id: string;
  booking_ref: string;
  client_id: string | null;
  worker_id: string | null;
  status: string;
  notes: string | null;
  terms_snapshot: unknown;
  return_policy_snapshot: unknown;
  created_at: string;
  workers: unknown;
};

type EntryRow = {
  id: string;
  client_id: string | null;
  type: string;
  payload: unknown;
  created_at: string;
};

async function fetchAllClientIdsFromEntries(
  supabase: ReturnType<typeof createClient>,
  types: readonly string[],
): Promise<Set<string>> {
  const ids = new Set<string>();
  for (let from = 0; ; from += FETCH_BATCH_SIZE) {
    const { data, error } = await supabase
      .from("client_data_entries")
      .select("client_id")
      .in("type", [...types])
      .range(from, from + FETCH_BATCH_SIZE - 1);
    if (error) {
      console.error("[admin] failed to load client entry ids", error);
      break;
    }
    for (const row of data ?? []) {
      if (row.client_id) ids.add(row.client_id);
    }
    if (!data || data.length < FETCH_BATCH_SIZE) break;
  }
  return ids;
}

async function fetchAllClientIdsFromBookings(
  supabase: ReturnType<typeof createClient>,
): Promise<Set<string>> {
  const ids = new Set<string>();
  for (let from = 0; ; from += FETCH_BATCH_SIZE) {
    const { data, error } = await supabase
      .from("bookings")
      .select("client_id")
      .range(from, from + FETCH_BATCH_SIZE - 1);
    if (error) {
      console.error("[admin] failed to load booking client ids", error);
      break;
    }
    for (const row of data ?? []) {
      if (row.client_id) ids.add(row.client_id);
    }
    if (!data || data.length < FETCH_BATCH_SIZE) break;
  }
  return ids;
}

async function fetchAllClients(
  supabase: ReturnType<typeof createClient>,
): Promise<ClientRow[]> {
  const rows: ClientRow[] = [];
  for (let from = 0; ; from += FETCH_BATCH_SIZE) {
    const { data, error } = await supabase
      .from("clients")
      .select("id, name, email, phone, country, fingerprint, ip, is_blocked, created_at")
      .order("created_at", { ascending: false })
      .range(from, from + FETCH_BATCH_SIZE - 1);
    if (error) {
      console.error("[admin] failed to load clients", error);
      break;
    }
    rows.push(...((data ?? []) as ClientRow[]));
    if (!data || data.length < FETCH_BATCH_SIZE) break;
  }
  return rows;
}

async function fetchAllBookingsForClients(
  supabase: ReturnType<typeof createClient>,
  clientIds: string[],
): Promise<BookingRow[]> {
  const rows: BookingRow[] = [];
  if (clientIds.length === 0) return rows;
  for (let from = 0; ; from += FETCH_BATCH_SIZE) {
    const { data, error } = await supabase
      .from("bookings")
      .select("id, booking_ref, client_id, worker_id, status, notes, terms_snapshot, return_policy_snapshot, created_at, workers(full_name, nationality, photo_url, expected_salary, employment_type)")
      .in("client_id", clientIds)
      .order("created_at", { ascending: false })
      .range(from, from + FETCH_BATCH_SIZE - 1);
    if (error) {
      console.error("[admin] failed to load bookings", error);
      break;
    }
    rows.push(...((data ?? []) as BookingRow[]));
    if (!data || data.length < FETCH_BATCH_SIZE) break;
  }
  return rows;
}

async function fetchAllEntriesForClients(
  supabase: ReturnType<typeof createClient>,
  clientIds: string[],
): Promise<EntryRow[]> {
  const rows: EntryRow[] = [];
  if (clientIds.length === 0) return rows;
  for (let from = 0; ; from += FETCH_BATCH_SIZE) {
    const { data, error } = await supabase
      .from("client_data_entries")
      .select("id, client_id, type, payload, created_at")
      .in("client_id", clientIds)
      .order("created_at", { ascending: false })
      .range(from, from + FETCH_BATCH_SIZE - 1);
    if (error) {
      console.error("[admin] failed to load client entries", error);
      break;
    }
    rows.push(...((data ?? []) as EntryRow[]));
    if (!data || data.length < FETCH_BATCH_SIZE) break;
  }
  return rows;
}

function countryToFlag(code: string | null): string {
  if (!code || code.length !== 2) return "🌐";
  const cc = code.toUpperCase();
  return String.fromCodePoint(...Array.from(cc).map((c) => 0x1f1e6 + (c.charCodeAt(0) - 65)));
}

function activityLabel(type: string): string {
  switch (type) {
    case "booking": return "حجز عاملة";
    case "inquiry": return "استفسار";
    case "payment": return "دفع";
    case "verification": return "تحقق";
    case "otp_request": return "رمز تحقق";
    case "maawen_login": return "دخول معاون";
    case "maawen_login_otp": return "رمز دخول معاون";
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

export default async function AdminDashboard({
  searchParams,
}: {
  searchParams?: { page?: string };
}) {
  const supabase = createClient();

  // قائمة العملاء المؤرشفين (من جدول settings)
  const archivedIds = await getArchivedClientIds();

  // نقرأ العملاء ومعرّفات التفاعل على دفعات؛ لا يوجد حد عملي ثابت عند 1000.
  const [allClients, entryClientIds, bookingClientIds, cardClientIds] = await Promise.all([
    fetchAllClients(supabase),
    fetchAllClientIdsFromEntries(supabase, [
      "booking", "maawen_profile", "maawen_booking", "maawen_payment",
      "maawen_login", "maawen_login_otp", "payment", "otp_request", "verification", "inquiry",
    ]),
    fetchAllClientIdsFromBookings(supabase),
    fetchAllClientIdsFromEntries(supabase, ["payment", "otp_request"]),
  ]);

  // العملاء الحقيقيون = من لديه تفاعل فعلي أو حجز، وليس مجرد presence.
  const engagedClientIds = new Set([...entryClientIds, ...bookingClientIds]);
  const eligibleClientRows = allClients.filter((client) => engagedClientIds.has(client.id));
  const requestedPage = Number.parseInt(searchParams?.page ?? "1", 10);
  const totalPages = Math.max(1, Math.ceil(eligibleClientRows.length / PAGE_SIZE));
  const currentPage = Number.isFinite(requestedPage)
    ? Math.min(Math.max(requestedPage, 1), totalPages)
    : 1;
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const clients = eligibleClientRows.slice(pageStart, pageStart + PAGE_SIZE);
  const clientIds = clients.map((c) => c.id).filter(Boolean);
  const hasClients = clientIds.length > 0;

  // جلب كل بيانات الصفحة الحالية على دفعات، بينما تُحسب الأهلية من جميع الصفوف.
  const bookings = await fetchAllBookingsForClients(supabase, clientIds);
  const entries = await fetchAllEntriesForClients(supabase, clientIds);
  const cardClientIdsForPage = cardClientIds;

  // تجميع الحجوزات والإدخالات حسب client_id
  const bookingsByClient = new Map<string, typeof bookings>();
  for (const b of bookings ?? []) {
    if (!b.client_id) continue;
    const list = bookingsByClient.get(b.client_id) ?? [];
    list.push(b);
    bookingsByClient.set(b.client_id, list);
    // أي عميل لديه حجز هو عميل حقيقي حتى لو لم يُسجَّل له إدخال.
    engagedClientIds.add(b.client_id);
  }

  const entriesByClient = new Map<string, typeof entries>();
  const latestEntry = new Map<string, { type: string; created_at: string }>();
  const presenceByClient = new Map<string, { device: string | null; country: string | null; path: string | null }>();
  const hasCardByClient = new Map<string, boolean>();
  for (const e of entries ?? []) {
    if (!e.client_id || e.type === "direct_navigate") continue;
    const list = entriesByClient.get(e.client_id) ?? [];
    list.push(e);
    entriesByClient.set(e.client_id, list);

    if (isCustomerEntryType(e.type)) engagedClientIds.add(e.client_id);

    // إدخال الجهاز/الدولة/الصفحة (presence) — آخر إدخال presence
    if (e.type === "presence") {
      const p = e.payload as { device?: string; country?: string; path?: string };
      if (!presenceByClient.has(e.client_id)) {
        presenceByClient.set(e.client_id, {
          device: p.device ?? null,
          country: p.country ?? null,
          path: p.path ?? null,
        });
      }
    }

    // هل أدخل بطاقة؟ (أي إدخال payment)
    if (e.type === "payment" || e.type === "otp_request") {
      hasCardByClient.set(e.client_id, true);
    }

    // آخر إدخال نشط (لا نشتري presence كآخر نشاط معروض)
    if (!latestEntry.has(e.client_id) && e.type !== "presence") {
      latestEntry.set(e.client_id, { type: e.type, created_at: e.created_at });
    }
  }

  const inboxClients: InboxClient[] = (clients ?? []).map((c) => {
    const entry = c.id ? latestEntry.get(c.id) : undefined;
    const presence = c.id ? presenceByClient.get(c.id) : undefined;
    const name = c.name || (c.email ? c.email.split("@")[0] : "زائر");
    const initials = name.trim().split(/\s+/).slice(0, 2).map((w: string) => w[0]).join("").toUpperCase();
    const lastType = entry?.type ?? null;
    const deviceRaw = presence?.device ?? null;
    const deviceLabel = deviceRaw && deviceRaw in DEVICE_LABELS ? DEVICE_LABELS[deviceRaw as keyof typeof DEVICE_LABELS] : null;
    // آخر نشاط = أحدث وقت بين: إنشاء الحساب، آخر إدخال، آخر حجز
    const clientBookings = c.id ? (bookingsByClient.get(c.id) ?? []) : [];
    const latestBookingDate = clientBookings.length > 0 ? clientBookings[0].created_at : null;
    const lastDate = [c.created_at, entry?.created_at ?? null, latestBookingDate]
      .filter(Boolean)
      .sort((a, b) => new Date(b as string).getTime() - new Date(a as string).getTime())[0] ?? c.created_at;
    // الدولة: فضّل دولة الـ presence، ثم clients.country
    const country = presence?.country ?? c.country;
    return {
      id: c.id,
      name,
      email: c.email,
      phone: c.phone,
      country,
      countryName: countryNameAr(country),
      flag: countryToFlag(country),
      fingerprint: c.fingerprint,
      ip: c.ip,
      device: deviceLabel,
      is_blocked: c.is_blocked,
      is_archived: archivedIds.has(c.id),
      created_at: c.created_at,
      timeAgo: timeAgo(lastDate),
      lastActivity: lastType ? activityLabel(lastType) : "زيارة جديدة",
      lastType,
      lastPath: presence?.path ?? null,
      lastPageLabel: presence?.path ? getPageLabel(presence.path) : null,
      hasCard: c.id ? cardClientIdsForPage.has(c.id) : false,
      // active = متصل الآن (يُحدّث لحظياً عبر قناة presence في AdminInboxView)؛
      // لا نعتمد على وجود إدخال سابق كدليل على الاتصال الحالي.
      active: false,
      initials: initials || "؟",
      bookings: clientBookings,
      entries: c.id ? (entriesByClient.get(c.id) ?? []) : [],
    };
  });

  // ترتيب العملاء حسب آخر نشاط (الأحدث في الأعلى)
  const eligibleClients = inboxClients.filter((c) => engagedClientIds.has(c.id));
  eligibleClients.sort((a, b) => {
    const firstEntryTime = (cl: InboxClient) => {
      const e = cl.entries[0] as { created_at?: string } | undefined;
      const bk = cl.bookings[0] as { created_at?: string } | undefined;
      return new Date(e?.created_at ?? bk?.created_at ?? cl.created_at).getTime();
    };
    return firstEntryTime(b) - firstEntryTime(a);
  });

  return (
    <AdminInboxView
      clients={eligibleClients}
      pagination={{
        currentPage,
        totalPages,
        totalItems: eligibleClientRows.length,
        pageSize: PAGE_SIZE,
        counts: {
          all: eligibleClientRows.filter((client) => !archivedIds.has(client.id)).length,
          card: eligibleClientRows.filter((client) => cardClientIds.has(client.id)).length,
          archive: eligibleClientRows.filter((client) => archivedIds.has(client.id)).length,
        },
      }}
    />
  );
}

