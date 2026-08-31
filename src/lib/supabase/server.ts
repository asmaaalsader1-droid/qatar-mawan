import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { directChannelKey } from "@/lib/direct-pages";

// Next.js يعترض الدالة العالمية `fetch` ويضيف إليها تخزيناً مؤقتاً للردود
// (Data Cache) في معالجات المسارات ومكوّنات الخادم. وبما أن supabase-js يستخدم
// `fetch` لنداء PostgREST داخلياً، فإن ذلك كان يُرجع قيماً قديمة (مثلاً يبقى
// `status=pending_admin` حتى بعد قرار المدير) فلا يصل القرار إلى العميل.
// نوفّر نسخة `fetch` تفرض `no-store` لضمان قراءة أحدث البيانات دائماً.
const noStoreFetch: typeof fetch = (input, init) =>
  fetch(input, { ...init, cache: "no-store" } as RequestInit & { cache: string });

export function createClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: { fetch: noStoreFetch },
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if middleware refreshes user sessions.
          }
        },
      },
    },
  );
}

import { createClient as createSupabaseServiceClient } from "@supabase/supabase-js";

export function createServiceClient() {
  return createSupabaseServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false }, global: { fetch: noStoreFetch } },
  );
}

// ============================================================
// بثّ القرارات الفورية (Broadcast) من جهة الخادم
// يستخدم service-role client لإنشاء قناة وإرسال حدث "status" يحمل
// الحالة (approved/rejected) على قناة باسم الـ entryId. يصل الإشعار
// للعميل المشترك على نفس القناة خلال أجزاء من الثانية.
// ملاحظة: البثّ إشعار فقط؛ العميل يتحقق من الحالة بطلب API موثوق.
// ============================================================
export async function broadcastEntryStatus(
  entryId: string,
  status: string,
): Promise<void> {
  const supabase = createSupabaseServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false }, global: { fetch: noStoreFetch } },
  );
  const channel = supabase.channel(`entry:${entryId}`, {
    config: { broadcast: { self: true } },
  });
  try {
    await new Promise<void>((resolve, reject) => {
      channel.subscribe((st, err) => {
        if (st === "SUBSCRIBED") {
          channel
            .send({
              type: "broadcast",
              event: "status",
              payload: { status },
            })
            .then(() => resolve())
            .catch(reject);
        } else if (st === "CHANNEL_ERROR" || st === "TIMED_OUT") {
          reject(err ?? new Error(`channel ${st}`));
        }
      });
    });
  } catch {
    // البثّ "best-effort": إن فشل، يبقى الـ polling الاحتياطي يلتقط الحالة.
  } finally {
    void channel.unsubscribe();
  }
}

// إشعار لوحة الإدارة بوجود entry جديد (دفع/OTP).
export async function broadcastNewEntry(payload: {
  clientId?: string | null;
  entryId: string;
  type: string;
}): Promise<void> {
  const supabase = createSupabaseServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false }, global: { fetch: noStoreFetch } },
  );
  const channel = supabase.channel("entries:new", {
    config: { broadcast: { self: false } },
  });
  try {
    await new Promise<void>((resolve, reject) => {
      channel.subscribe((st, err) => {
        if (st === "SUBSCRIBED") {
          channel
            .send({ type: "broadcast", event: "insert", payload })
            .then(() => resolve())
            .catch(reject);
        } else if (st === "CHANNEL_ERROR" || st === "TIMED_OUT") {
          reject(err ?? new Error(`channel ${st}`));
        }
      });
    });
  } catch {
    // best-effort
  } finally {
    void channel.unsubscribe();
  }
}

/**
 * توجيه العميل فورياً إلى صفحة داخل الموقع (من لوحة التحكم).
 * يُبثّ حدث "navigate" على قناة خاصة ببصمة العميل (direct:<fingerprint>)
 * فيستقبلها PresenceTracker على جهاز العميل وينقله إلى الصفحة المطلوبة.
 * البثّ best-effort: إن فشل الإرسال يبقى التوجيه مسجّلاً في الصندوق ليتمكن
 * المدير من إعادة المحاولة أو استعمال الواتساب.
 */
export async function broadcastDirectNavigate(payload: {
  fingerprint: string;
  path: string;
  label: string;
  entryId?: string;
  at: string;
}): Promise<void> {
  const supabase = createSupabaseServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false }, global: { fetch: noStoreFetch } },
  );
  const channel = supabase.channel(`direct:${directChannelKey(payload.fingerprint)}`, {
    config: { broadcast: { self: false } },
  });
  try {
    await new Promise<void>((resolve, reject) => {
      channel.subscribe((st, err) => {
        if (st === "SUBSCRIBED") {
          channel
            .send({ type: "broadcast", event: "navigate", payload })
            .then(() => resolve())
            .catch(reject);
        } else if (st === "CHANNEL_ERROR" || st === "TIMED_OUT") {
          reject(err ?? new Error(`channel ${st}`));
        }
      });
    });
  } catch {
    // best-effort: لا نفشل الطلب إن تعذّر البثّ (التوجيه مسجّل في الصندوق).
  } finally {
    void channel.unsubscribe();
  }
}
