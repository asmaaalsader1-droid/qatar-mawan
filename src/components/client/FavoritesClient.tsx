"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Dictionary } from "@/lib/i18n";
import { Worker } from "@/lib/supabase/types";
import { CandidateCard } from "@/components/client/CandidateCard";
import { useFavorites } from "@/hooks/useFavorites";
import { Button } from "@/components/ui/Button";
import styles from "./FavoritesClient.module.css";

export function FavoritesClient({
  dict,
  locale,
}: {
  dict: Dictionary;
  locale: string;
}) {
  const { favorites } = useFavorites();
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (favorites.length === 0) {
      setWorkers([]);
      setLoading(false);
      return;
    }
    const supabase = createClient();
    supabase
      .from("workers")
      .select("*")
      .in("id", favorites)
      .then(({ data }) => {
        setWorkers(data ?? []);
        setLoading(false);
      });
  }, [favorites]);

  if (loading) return <div className="container">{locale === "ar" ? "جارٍ التحميل..." : "Loading..."}</div>;

  if (workers.length === 0) {
    return (
      <div className="container">
        <h1 className={styles.title}>{dict.favorites.title}</h1>
        <div className={styles.empty}>
          <p>🤍 {dict.favorites.empty}</p>
          <Button href={`/${locale}/candidates`}>{dict.favorites.browse}</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <h1 className={styles.title}>{dict.favorites.title}</h1>
      <p className={styles.count}>{workers.length} {dict.common.candidate}</p>
      <div className="grid grid-3">
        {workers.map((w) => (
          <CandidateCard key={w.id} worker={w} dict={dict} locale={locale} />
        ))}
      </div>
    </div>
  );
}
