"use client";

import Link from "next/link";
import { useState } from "react";
import { Worker, salaryPeriod } from "@/lib/supabase/types";
import { Dictionary } from "@/lib/i18n";
import { Badge } from "@/components/ui/Badge";
import { formatWorkerPrice } from "@/lib/pricing";
import { useFavorites } from "@/hooks/useFavorites";
import { CandidateImage } from "./CandidateImage";
import { HeartIcon } from "@/components/ui/Icons";
import { translateNationality, translateSkill } from "@/lib/translate";
import styles from "./CandidateCard.module.css";

export function CandidateCard({
  worker,
  dict,
  locale,
  view,
  priority = false,
}: {
  worker: Worker;
  dict: Dictionary;
  locale: string;
  view?: "grid" | "list";
  priority?: boolean;
}) {
  const prefix = `/${locale}`;
  const { isFav, toggleFav } = useFavorites();
  const [fav, setFav] = useState(false);
  const isAr = locale === "ar";

  useState(() => {
    setFav(isFav(worker.id));
  });

  const period = salaryPeriod(worker.employment_type);

  return (
    <div className={`${styles.card} ${view === "list" ? styles.list : ""}`}>
      <div className={styles.imageWrap}>
        <CandidateImage worker={worker} locale={locale as "ar" | "en"} className={styles.image} priority={priority} />
        <button
          className={`${styles.fav} ${fav ? styles.favActive : ""}`}
          onClick={() => {
            const next = toggleFav(worker.id);
            setFav(next);
          }}
          aria-label={fav ? dict.common.savedFavorite : dict.common.saveFavorite}
          aria-pressed={fav}
        >
          <HeartIcon filled={fav} />
        </button>
      </div>
      <div className={styles.body}>
        <div className={styles.header}>
          <h3 className={styles.name}>{worker.full_name}</h3>
          {worker.availability === "available" ? (
            <Badge variant="available">{dict.common.available}</Badge>
          ) : (
            <Badge variant="booked">{dict.common.booked}</Badge>
          )}
        </div>
        <p className={styles.meta}>
          {translateNationality(worker.nationality, locale)} · {dict.profile.experience}: {worker.experience_years} {isAr ? "سنة" : "yrs"}
        </p>
        <p className={styles.skills}>{worker.skills.map((s) => translateSkill(s, locale)).join(" · ")}</p>
        <p className={styles.salary}>
          {formatWorkerPrice(worker, locale)}{period ? ` · ${dict.common[period]}` : ""}
        </p>
        <div className={styles.actions}>
          <Link href={`${prefix}/candidates/${worker.slug}`} className={styles.viewBtn}>
            {dict.common.viewProfile}
          </Link>
          <Link href={`${prefix}/client-info?worker=${encodeURIComponent(worker.slug)}`} className={styles.bookBtn}>
            {dict.common.book}
          </Link>
        </div>
      </div>
    </div>
  );
}
