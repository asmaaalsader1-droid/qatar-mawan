"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { getFingerprint } from "@/lib/presence";
import { subscribeToDirectNavigate } from "@/lib/realtime";

const FP_COOKIE = "khdm-fp";
const PRESENCE_ROOM = "presence-global";

/** يستخرج لغة الصفحة الحالية من المسار ليبني رابطاً محلياً باللغة نفسها. */
function getCurrentLocale(): string {
  if (typeof window === "undefined") return "ar";
  const m = window.location.pathname.match(/^\/(ar|en)(?:\/|$)/);
  return m ? m[1] : "ar";
}

/** المسار الحالي بدون بادئة اللغة — يُبثّ للوحة التحكم لمعرفة صفحة العميل الفعلية. */
function getCurrentPath(): string {
  if (typeof window === "undefined") return "/";
  return window.location.pathname;
}

/**
 * مكوّن تتبّع حضور العميل:
 *  - يُسجّل البصمة في كوكي ليقرأها الـ middleware في فحص الحظر.
 *  - يبعث beacon حضور إلى قناة presence-global عبر Supabase Realtime Presence.
 *  - يحدّث الحالة فوراً عند: الدخول، تبديل التبويب (visibilitychange)،
 *    الخروج (beforeunload / pagehide).
 *  - يُرسل heartbeat خفيف كل 25 ثانية لإبقاء الحضور حياً (Presence
 *    نفسه يدعم ذلك، لكن heartbeat إضافي يضمن دقة "نشط الآن").
 */
export function PresenceTracker() {
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>["channel"]> | null>(null);

  useEffect(() => {
    const supabase = createClient();
    const fp = getFingerprint();

    // خزّن البصمة في كوكي ليقرأها الـ middleware (مدة سنة).
    document.cookie = `${FP_COOKIE}=${encodeURIComponent(fp)}; path=/; max-age=31536000; SameSite=Lax`;

    // يبثّ حضوراً (مع الصفحة الحالية) إلى الـ API — يُنشئ/يحدّث صف العميل
    // ويخزّن آخر صفحة (path) ليعرفها المدير في لوحة التحكم حتى لو كان غير متصل.
    const reportPresence = () => {
      fetch("/api/presence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fingerprint: fp, path: getCurrentPath() }),
        keepalive: true,
      }).catch(() => {});
    };
    reportPresence();

    // ينفّذ التوجيه إلى صفحة داخل الموقع بنفس لغة الصفحة الحالية.
    const navigateTo = (path: string) => {
      const locale = getCurrentLocale();
      const base = path === "/" ? `/${locale}` : `/${locale}${path}`;
      if (window.location.pathname === base) return;
      window.location.assign(base);
    };

    // أخبر الخادم باستلام التوجيه حتى لا يُعاد تنفيذه لاحقاً (يُعلَّم received_at).
    const ackDirect = (entryId?: string) => {
      if (!entryId) return;
      fetch("/api/direct/ack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entryId }),
      }).catch(() => {});
    };

    // اشترك في أوامر التوجيه من المدير (لوحة التحكم): عند استلام أمر "navigate"
    // ينتقل العميل فوراً إلى الصفحة المطلوبة.
    const directChannel = subscribeToDirectNavigate(fp, (path, entryId) => {
      ackDirect(entryId);
      navigateTo(path);
    });

    // تحقق من التوجيهات المعلّقة: إن كان المدير قد وجّه العميل إليه وهو غير متصل
    // (خلال آخر 5 دقائق)، يُنفَّذ التوجيه عند فتح الصفحة.
    fetch(`/api/direct/pending?fingerprint=${encodeURIComponent(fp)}`, { cache: "no-store" })
      .then((r) => r.json().catch(() => null))
      .then((data) => {
        if (data?.pending && data.path) navigateTo(String(data.path));
      })
      .catch(() => {});

    // اشترك في قناة Presence لإبقاء العميل "متصل" في الذاكرة المشتركة.
    const channel = supabase.channel(PRESENCE_ROOM, {
      config: { presence: { key: fp } },
    });

    const track = (state: "online" | "away") => {
      void channel.track({
        fp,
        state,
        path: getCurrentPath(),
        at: new Date().toISOString(),
      });
    };

    channel
      .on("presence", { event: "sync" }, () => {})
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ fp, state: "online", path: getCurrentPath(), at: new Date().toISOString() });
        }
      });

    channelRef.current = channel;

    // heartbeat دوري لإبقاء الحضور حياً مع بعث الصفحة الحالية دوماً
    const heartbeat = setInterval(() => {
      track("online");
      reportPresence();
    }, 25000);

    // عند إخفاء التبويب: علّم العميل "بعيد"
    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        track("away");
        navigator.sendBeacon?.("/api/presence", JSON.stringify({ fingerprint: fp, state: "away" }));
      } else {
        track("online");
        reportPresence();
      }
    };

    // عند مغادرة الصفحة: ألغِ التتبّع ليُصبح العميل "غير متصل"
    const onUnload = () => {
      track("away");
      navigator.sendBeacon?.("/api/presence", JSON.stringify({ fingerprint: fp, state: "away", path: getCurrentPath() }));
    };

    // تتبّع الصفحة الحالية لحظياً: عند الرجوع (popstate — زر الرجوع/السهم)
    // أو التنقل بين صفحات التطبيق (SPA pushState) أو تحديث الصفحة (load).
    // نبعث حضوراً جديداً بآخر مسار ليظهر اسم الصفحة الصحيح في لوحة التحكم فوراً.
    const onPathChange = () => {
      track("online");
      reportPresence();
    };
    const onPopState = () => onPathChange();

    // نراقب pushState/replaceState (التنقل داخل SPA) عبر تغليفها.
    const patchHistory = () => {
      const origPush = history.pushState;
      const origReplace = history.replaceState;
      history.pushState = function (...args) {
        const result = origPush.apply(this, args);
        window.dispatchEvent(new Event("khdm:pathchange"));
        return result;
      };
      history.replaceState = function (...args) {
        const result = origReplace.apply(this, args);
        window.dispatchEvent(new Event("khdm:pathchange"));
        return result;
      };
      return () => {
        history.pushState = origPush;
        history.replaceState = origReplace;
      };
    };
    const unpatch = patchHistory();
    const onPathChangeEvent = () => onPathChange();

    window.addEventListener("popstate", onPopState);
    window.addEventListener("khdm:pathchange", onPathChangeEvent);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("beforeunload", onUnload);
    window.addEventListener("pagehide", onUnload);

    return () => {
      clearInterval(heartbeat);
      unpatch();
      window.removeEventListener("popstate", onPopState);
      window.removeEventListener("khdm:pathchange", onPathChangeEvent);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("beforeunload", onUnload);
      window.removeEventListener("pagehide", onUnload);
      void channel.unsubscribe();
      void directChannel.unsubscribe();
    };
  }, []);

  return null;
}
