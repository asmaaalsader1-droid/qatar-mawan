"use client";

import { createClient } from "@/lib/supabase/client";
import { directChannelKey } from "@/lib/direct-pages";
import type { RealtimeChannel } from "@supabase/supabase-js";

export type RealtimeHandler<T> = (payload: T) => void;

export function subscribeToTable<T>(
  table: string,
  event: "INSERT" | "UPDATE" | "DELETE" | "*",
  handler: RealtimeHandler<{ new: T; old: T | null; eventType: string }>,
): RealtimeChannel {
  const supabase = createClient();
  return supabase
    .channel(`realtime-${table}-${event}`)
    .on("postgres_changes", { event, schema: "public", table }, (payload) => {
      handler({
        new: payload.new as T,
        old: (payload.old as T) ?? null,
        eventType: payload.eventType,
      });
    })
    .subscribe();
}

export function subscribePresence(
  room: string,
  onJoin: (key: string) => void,
  onLeave: (key: string) => void,
  onSync: (keys: string[]) => void,
): RealtimeChannel {
  const supabase = createClient();
  const channel = supabase.channel(`presence-${room}`, {
    config: { presence: { key: "" } },
  });
  channel
    .on("presence", { event: "join" }, ({ key }) => onJoin(key as string))
    .on("presence", { event: "leave" }, ({ key }) => onLeave(key as string))
    .on("presence", { event: "sync" }, () => {
      const state = channel.presenceState();
      onSync(Object.keys(state));
    });
  return channel;
}

// ============================================================
// بثّ القرارات الفورية (Broadcast)
// نستخدم قناة باسم الـ entryId (uuid غير قابل للتخمين) حتى لا يحتاج
// العميل لصلاحية قراءة الجدول (RLS تبقى للأدمن فقط). عند قرار المدير
// يبثّ الخادم الحالة على هذه القناة فيستقبلها العميل لحظياً.
// ملاحظة أمنية: البثّ يُعتبر "إشعاراً" فقط، والعميل يتحقق من الحالة
// الفعلية بطلب API موثوق بعد الإشعار (لا يثق بالبثّ وحده).
// ============================================================

// اشتراك العميل: يستقبل إشعار قرار المدير على صفّه.
export function subscribeToEntryStatus(
  entryId: string,
  onStatus: (status: string) => void,
  onReconnect?: () => void,
): RealtimeChannel {
  const supabase = createClient();
  let errored = false;
  return supabase
    .channel(`entry:${entryId}`, { config: { broadcast: { self: false } } })
    .on("broadcast", { event: "status" }, ({ payload }) => {
      const status = (payload as { status?: string })?.status;
      if (status) onStatus(status);
    })
    .subscribe((status) => {
      // عند إعادة الاتصال بعد انقطاع، أعد جلب الحالة احتياطاً.
      if (status === "SUBSCRIBED" && errored) {
        errored = false;
        onReconnect?.();
      } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        errored = true;
      }
    });
}

// اشتراك العميل: يستقبل أمر توجيه من المدير (من لوحة التحكم) لينتقل إلى
// صفحة داخل الموقع فوراً. القناة خاصة ببصمة العميل حتى لا يستقبلها غيره.
export function subscribeToDirectNavigate(
  fingerprint: string,
  onNavigate: (path: string, entryId?: string) => void,
): RealtimeChannel {
  const supabase = createClient();
  return supabase
    .channel(`direct:${directChannelKey(fingerprint)}`, { config: { broadcast: { self: false } } })
    .on("broadcast", { event: "navigate" }, ({ payload }) => {
      const p = payload as { path?: string; entryId?: string };
      if (p.path) onNavigate(p.path, p.entryId);
    })
    .subscribe();
}

// اشتراك لوحة الإدارة: يستقبل إشعار وجود entry جديد (دفع/OTP) لتحديث القائمة لحظياً.
export function subscribeToNewEntries(
  onNew: (payload: { clientId?: string; entryId?: string; type?: string }) => void,
): RealtimeChannel {
  const supabase = createClient();
  return supabase
    .channel("entries:new", { config: { broadcast: { self: false } } })
    .on("broadcast", { event: "insert" }, ({ payload }) => {
      onNew(
        (payload ?? {}) as { clientId?: string; entryId?: string; type?: string },
      );
    })
    .subscribe();
}
