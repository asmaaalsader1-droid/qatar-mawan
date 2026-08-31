"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ClientInboxClient, type InboxClient } from "./ClientInboxClient";
import { ClientDetailPanel } from "./ClientDetailPanel";
import { createClient } from "@/lib/supabase/client";
import { subscribeToNewEntries } from "@/lib/realtime";
import { getPageLabel } from "@/lib/page-labels";
import styles from "./AdminInboxView.module.css";

const PRESENCE_ROOM = "presence-global";

type InboxPagination = {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  counts: { all: number; card: number; archive: number };
};

export function AdminInboxView({
  clients,
  pagination,
}: {
  clients: InboxClient[];
  pagination: InboxPagination;
}) {
  const router = useRouter();
  const [activeId, setActiveId] = useState<string | null>(
    clients.length > 0 ? clients[0].id : null,
  );
  // على الهاتف فقط: تبديل بين قائمة الوارد (العرض الافتراضي) ولوحة تفاصيل العميل.
  // showDetail=false ⟶ القائمة تملأ الشاشة؛ showDetail=true ⟶ لوحة التفاصيل تملأ الشاشة.
  // لا تأثير لهذا المتغير على الكمبيوتر (يتحكم فيه CSS فقط عبر media query).
  const [mobileShowDetail, setMobileShowDetail] = useState(false);
  // نسخة محلية قابلة للتحديث لحظياً عند وصول entries جديدة (دفع/OTP).
  // تُزامَن مع الـ props القادمة من الخادم عند كل router.refresh()
  // حتى يظهر العملاء الجدد والتحديثات دون إعادة تحميل الصفحة.
  const [liveClientList, setLiveClientList] = useState<InboxClient[]>(clients);
  // مجموعة البصمات النشطة الآن (من قناة presence)
  const [onlineFps, setOnlineFps] = useState<Set<string>>(new Set());
  // منع تكرار router.refresh() خلال فترة قصيرة (debounce) عند تدفّق إشعارات.
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // مزامنة القائمة المحلية مع الـ props الجديدة من الخادم بعد router.refresh().
  // هذا يُظهر العملاء الجدد والتحديثات فوراً.
  useEffect(() => {
    setLiveClientList(clients);
    if (clients.length === 0) {
      setActiveId(null);
      return;
    }
    if (!activeId || !clients.some((client) => client.id === activeId)) {
      setActiveId(clients[0].id);
      setMobileShowDetail(false);
    }
  }, [clients, activeId]);

  // اشترك في قناة presence لعرض النشطين لحظياً + تتبّع الصفحة الحالية لكل عميل.
  // بثّ PresenseTracker يتضمن path — نحدّث اسم الصفحة في القائمة الجانبية فوراً
  // عند انتقال العميل أو الرجوع خطوة دون انتظار إعادة تحميل اللوحة.
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase.channel(PRESENCE_ROOM, {
      config: { presence: { key: "admin" } },
    });

    // البصمة الحالية للعميل المتصل → صفحته الحالية (تُقرأ لحظياً).
    const livePaths = new Map<string, string>();

    const sync = () => {
      const state = channel.presenceState<{ fp?: string; state?: string; path?: string }>();
      const next = new Set<string>();
      for (const key of Object.keys(state)) {
        const presences = state[key];
        for (const p of presences) {
          if (p.state === "online" && p.fp) {
            next.add(p.fp);
            if (p.path) livePaths.set(p.fp, p.path);
            else livePaths.delete(p.fp);
          }
        }
      }
      setOnlineFps(next);
      // حدّث اسم الصفحة لحظياً لكل عميل نشط.
      if (livePaths.size > 0) {
        setLiveClientList((prev) =>
          prev.map((c) => {
            const activePath = livePaths.get(c.fingerprint);
            if (!activePath || activePath === c.lastPath) return c;
            return {
              ...c,
              lastPath: activePath,
              lastPageLabel: getPageLabel(activePath),
            };
          }),
        );
      }
    };

    channel.on("presence", { event: "sync" }, sync);
    channel.on("presence", { event: "join" }, sync);
    channel.on("presence", { event: "leave" }, sync);
    channel.subscribe();

    return () => {
      void channel.unsubscribe();
    };
  }, []);

  // عند وصول إشعار "entry جديد" (دفع/OTP): أعد جلب لوحة الإدارة من الخادم.
  // router.refresh() يُعيد تشغيل الـ server component فقط (دون إعادة تحميل الصفحة)
  // فيجلب العملاء الجدد والـ entries المُحدّثة، ثم يُزامن الـ effect أعلاه القائمة.
  // نستخدم debounce لتفادي تكرار الطلب عند تدفّق عدة إشعارات متتالية.
  const triggerRefresh = useCallback(() => {
    if (refreshTimer.current) clearTimeout(refreshTimer.current);
    refreshTimer.current = setTimeout(() => {
      router.refresh();
    }, 400);
  }, [router]);

  // نغمة الإشعار: تُشغَّل عند وصول بطاقة دفع/OTP جديدة.
  // المتصفحات تمنع الصوت التلقائي قبل تفاعل المستخدم مع الصفحة، لذا إن فشل
  // التشغيل نُعلّق الإشعار ونُشغّله عند أول تفاعل (click/keydown) من المدير.
  const notificationAudio = useRef<HTMLAudioElement | null>(null);
  const pendingNotification = useRef(false);

  const playNotification = useCallback(() => {
    if (!notificationAudio.current) {
      notificationAudio.current = new Audio("/sounds/notification.mp3");
      notificationAudio.current.preload = "auto";
    }
    const audio = notificationAudio.current;
    audio.currentTime = 0;
    const playPromise = audio.play();
    if (playPromise) {
      playPromise.catch(() => {
        // autoplay محظور حتى يتفاعل المدير مع الصفحة — علّق النغمة.
        pendingNotification.current = true;
      });
    }
  }, []);

  // شغّل النغمة المعلّقة عند أول تفاعل من المدير (يفتح سياسة autoplay).
  useEffect(() => {
    const flush = () => {
      if (!pendingNotification.current) return;
      pendingNotification.current = false;
      if (notificationAudio.current) {
        notificationAudio.current.currentTime = 0;
        void notificationAudio.current.play().catch(() => {});
      }
    };
    window.addEventListener("click", flush);
    window.addEventListener("keydown", flush);
    window.addEventListener("pointerdown", flush);
    return () => {
      window.removeEventListener("click", flush);
      window.removeEventListener("keydown", flush);
      window.removeEventListener("pointerdown", flush);
    };
  }, []);

  // اشترك في إشعارات "entry جديد" لتظهر في اللوحة لحظياً دون polling.
  useEffect(() => {
    const channel = subscribeToNewEntries(() => {
      playNotification();
      triggerRefresh();
    });
    return () => {
      void channel.unsubscribe();
    };
  }, [triggerRefresh, playNotification]);

  // ادمج حالة "نشط الآن" مع البيانات الأساسية
  const liveClients = liveClientList.map((c) => ({
    ...c,
    active: onlineFps.has(c.fingerprint) || c.active,
  }));

  const activeClient = liveClients.find((c) => c.id === activeId) ?? null;

  // على الهاتف: عند اختيار عميل من القائمة، اعرض لوحة التفاصيل بدلاً من القائمة.
  const handleSelect = (id: string) => {
    setActiveId(id);
    setMobileShowDetail(true);
  };

  // على الهاتف: زر الرجوع في لوحة التفاصيل يعيد القائمة (العرض الافتراضي).
  const handleMobileBack = () => setMobileShowDetail(false);

  // ===== معالجات الإجراءات =====
  async function handleBlock(clientId: string, blocked: boolean) {
    await fetch("/api/admin/block-client", {
      method: blocked ? "POST" : "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(blocked ? { clientId } : { clientId }),
    }).catch(() => {});
    window.location.reload();
  }

  async function handleBulkBlock(ids: string[]) {
    await Promise.all(
      ids.map((id) =>
        fetch("/api/admin/block-client", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ clientId: id }),
        }).catch(() => {}),
      ),
    );
    window.location.reload();
  }

  async function handleArchive(ids: string[]) {
    // افصل بين الأرشفة وإلغاء الأرشفة (المُحدّدة بـ "un:")
    const toArchive = ids.filter((id) => !id.startsWith("un:"));
    const toUnarchive = ids.filter((id) => id.startsWith("un:")).map((id) => id.slice(3));
    await Promise.all([
      ...toArchive.map((id) =>
        fetch("/api/admin/archive-client", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ clientId: id, action: "archive" }),
        }).catch(() => {}),
      ),
      ...toUnarchive.map((id) =>
        fetch("/api/admin/archive-client", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ clientId: id, action: "unarchive" }),
        }).catch(() => {}),
      ),
    ]);
    window.location.reload();
  }

  // أرشفة/إلغاء أرشفة عميل واحد من لوحة التفاصيل
  async function handleArchiveSingle(clientId: string, archive: boolean) {
    await fetch("/api/admin/archive-client", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId, action: archive ? "archive" : "unarchive" }),
    }).catch(() => {});
    window.location.reload();
  }

  async function handleDelete(ids: string[]) {
    try {
      const response = await fetch("/api/admin/delete-client", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientIds: ids }),
      });
      const result = (await response.json().catch(() => ({}))) as { error?: string; deleted?: number };
      if (!response.ok) {
        window.alert(result.error ?? "تعذر حذف العملاء المحددين.");
        return;
      }
      window.alert(`تم حذف ${result.deleted ?? ids.length} عميل بنجاح.`);
      window.location.reload();
    } catch {
      window.alert("تعذر الاتصال بالخادم. حاول مرة أخرى.");
    }
  }

  // حذف عميل واحد من لوحة التفاصيل
  async function handleDeleteSingle(clientId: string) {
    try {
      const response = await fetch("/api/admin/delete-client", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientIds: [clientId] }),
      });
      const result = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        window.alert(result.error ?? "تعذر حذف العميل.");
        return;
      }
      window.location.reload();
    } catch {
      window.alert("تعذر الاتصال بالخادم. حاول مرة أخرى.");
    }
  }

  // تحديث حالة entry محلياً بعد قرار المدير (موافقة/رفض) دون إعادة تحميل الصفحة.
  const handleEntryDecided = useCallback(
    (entryId: string, status: "approved" | "rejected") => {
      setLiveClientList((prev) =>
        prev.map((c) => {
          const entries = (c.entries as Array<Record<string, unknown>>) ?? [];
          let changed = false;
          const nextEntries = entries.map((e) => {
            if ((e as { id?: string })?.id !== entryId) return e;
            changed = true;
            const payload = (e.payload as Record<string, unknown>) ?? {};
            return {
              ...e,
              payload: { ...payload, status },
            };
          });
          return changed ? { ...c, entries: nextEntries } : c;
        }),
      );
    },
    [],
  );

  return (
    <div
      className={`${styles.layout} ${mobileShowDetail ? styles.layoutDetail : ""}`}
      data-mobile-view={mobileShowDetail ? "detail" : "list"}
    >
      <ClientInboxClient
        clients={liveClients}
        pagination={pagination}
        activeId={activeId}
        onSelect={handleSelect}
        onArchive={handleArchive}
        onDelete={handleDelete}
        onBlock={handleBulkBlock}
      />
      <ClientDetailPanel
        client={activeClient}
        onBlock={handleBlock}
        onArchive={handleArchiveSingle}
        onDelete={handleDeleteSingle}
        onEntryDecided={handleEntryDecided}
        onMobileBack={handleMobileBack}
      />
    </div>
  );
}
