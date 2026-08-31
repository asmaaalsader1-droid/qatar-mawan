"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const FP_STORAGE_KEY = "khdm-qatar-fingerprint";
const RANDOM_FP_LENGTH = 40;
const RANDOM_FP_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
// Session-only fallback fingerprint (localStorage unavailable: private mode,) — stable per page-load.

let sessionFp: string | null = null;

function randomFingerprint(): string {
  const bytes = new Uint8Array(RANDOM_FP_LENGTH);
  crypto.getRandomValues(bytes);
  let out = "";
  for (const b of bytes) {
    out += RANDOM_FP_CHARS[b % RANDOM_FP_CHARS.length];
  }
  return out;
}

/**
 * Per-browser unique ID stored in localStorage — NOT a hash of device info.
 *
 * The old deterministic design hashed only userAgent/language/screen/timezone/cores, so
 * identical devices (same model, same browser, same resolution) produced the SAME
 * fingerprint and got merged into ONE client row in the admin inbox (one "tab").
 *
 * Now we generate a random 40-char alphanumeric ID once per browser profile. On next
 * visit, any legacy deterministic fingerprint (exactly 24 base64 chars) is detected
 * and instantly rotated → collided clients diverge into their own rows from then on.
 */
export function getFingerprint(): string {
  if (typeof window === "undefined") return "ssr";
  try {
    const stored = localStorage.getItem(FP_STORAGE_KEY);
    const isValid =
      typeof stored === "string" &&
      stored.length === RANDOM_FP_LENGTH &&
      /^[A-Za-z0-9]{40}$/.test(stored);
    if (!isValid) {
      const fp = randomFingerprint();
      localStorage.setItem(FP_STORAGE_KEY, fp);
      return fp;
    }
    return stored;
  } catch {
    // localStorage unavailable (private mode?) → session-only opaque id.
    if (sessionFp) return sessionFp;
    const nav = navigator;
    const seed = [
      nav.userAgent,
      nav.language,
      screen.width,
      screen.height,
      new Date().getTimezoneOffset(),
      Math.random(),
    ].join("|");
    sessionFp = btoa(seed).slice(0, 40);
    return sessionFp;
  }
}
export function usePresence() {
  const [activeCount, setActiveCount] = useState(0);
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>["channel"]> | null>(null);

  useEffect(() => {
    const supabase = createClient();
    const fp = getFingerprint();
    const channel = supabase.channel("presence-global", {
      config: { presence: { key: fp } },
    });
    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        setActiveCount(Object.keys(state).length);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ fp, at: new Date().toISOString() });
        }
      });
    channelRef.current = channel;

    return () => {
      void channel.unsubscribe();
    };
  }, []);

  return activeCount;
}

export async function registerDailyVisit(fingerprint: string) {
  const supabase = createClient();
  const { error } = await supabase.from("daily_visitors").upsert(
    {
      date: new Date().toISOString().slice(0, 10),
      fingerprint,
    },
    { onConflict: "date,fingerprint" },
  );
  if (error) console.warn("daily_visitors upsert failed:", error.message);
}

export async function ensureClient(
  fingerprint: string,
  meta: { ip?: string | null; country?: string | null; name?: string; email?: string; phone?: string },
) {
  const supabase = createClient();
  const { data: existing } = await supabase
    .from("clients")
    .select("id")
    .eq("fingerprint", fingerprint)
    .maybeSingle();

  if (existing) {
    const updates: Record<string, unknown> = {};
    if (meta.ip) updates.ip = meta.ip;
    if (meta.country) updates.country = meta.country;
    if (meta.name) updates.name = meta.name;
    if (meta.email) updates.email = meta.email;
    if (meta.phone) updates.phone = meta.phone;
    if (Object.keys(updates).length) {
      await supabase.from("clients").update(updates).eq("id", existing.id);
    }
    return existing.id;
  }
  const { data, error } = await supabase
    .from("clients")
    .insert({
      fingerprint,
      ip: meta.ip ?? null,
      country: meta.country ?? null,
      name: meta.name ?? null,
      email: meta.email ?? null,
      phone: meta.phone ?? null,
    })
    .select("id")
    .single();
  if (error) {
    console.warn("ensureClient insert failed:", error.message);
    return null;
  }
  return data?.id ?? null;
}
