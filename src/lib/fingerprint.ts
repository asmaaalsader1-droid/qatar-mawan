"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export async function checkBlocked(fingerprint: string, ip?: string | null): Promise<boolean> {
  const supabase = createClient();
  const orClause = [`fingerprint.eq.${fingerprint}`];
  if (ip) orClause.push(`ip.eq.${ip}`);
  const { data } = await supabase
    .from("blocked_clients")
    .select("id")
    .or(orClause.join(","))
    .maybeSingle();
  return !!data;
}

export async function recordPageView(fingerprint: string, page: string) {
  const supabase = createClient();
  await supabase.from("client_data_entries").insert({
    client_id: null,
    type: "page_view",
    payload: { fingerprint, page, at: new Date().toISOString() },
  });
}

export function useBlockGuard(fingerprint: string) {
  useEffect(() => {
    let active = true;
    checkBlocked(fingerprint).then((blocked) => {
      if (blocked && active && typeof window !== "undefined") {
        window.location.href = "/blocked";
      }
    });
    return () => {
      active = false;
    };
  }, [fingerprint]);
}
