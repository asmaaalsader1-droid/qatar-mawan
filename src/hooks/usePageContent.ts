"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { PageContent } from "@/lib/supabase/types";

export function usePageContent(page: string, locale = "ar") {
  const [content, setContent] = useState<Record<string, Record<string, unknown>>>({});

  useEffect(() => {
    const supabase = createClient();
    const load = () =>
      supabase
        .from("page_content")
        .select("*")
        .eq("page", page)
        .eq("locale", locale)
        .then(({ data }) => {
          const map: Record<string, Record<string, unknown>> = {};
          (data as PageContent[] | null)?.forEach((row) => {
            map[row.section] = row.content;
          });
          setContent(map);
        });

    load();

    const channel = supabase
      .channel(`page-${page}-${locale}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "page_content", filter: `page=eq.${page}` },
        () => load(),
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [page, locale]);

  return content;
}
