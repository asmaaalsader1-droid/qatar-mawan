"use client";

import { useState } from "react";
import Image from "next/image";
import { Worker } from "@/lib/supabase/types";
import { translateNationality } from "@/lib/translate";
import styles from "./CandidateImage.module.css";

// ألوان حسب الجنسية لتوليد صورة رمزية احترافية
const NATIONALITY_COLORS: Record<string, [string, string]> = {
  "فلبينية": ["#1B3A5C", "#C8A04A"],
  "Filipina": ["#1B3A5C", "#C8A04A"],
  "إثيوبية": ["#142C46", "#B08A3A"],
  "Ethiopian": ["#142C46", "#B08A3A"],
  "أوغندية": ["#2C5282", "#D69E2E"],
  "Ugandan": ["#2C5282", "#D69E2E"],
};

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "؟";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function getColors(nationality: string): [string, string] {
  return NATIONALITY_COLORS[nationality] ?? ["#1B3A5C", "#C8A04A"];
}

/**
 * مكوّن صورة العاملة — يستخدم next/image لتحسين الصورة تلقائياً
 * (تصغير + WebP + تخزين مؤقت على خادم Next.js). يتولّد نسخة محسّنة واحدة
 * لكل (src + photoVersion) فتتغيّر تلقائياً عند تحديث المدير للصورة.
 * عند غياب صورة حقيقية يُولّد صورة SVG رمزية احترافية بالأحرف الأولى.
 */
export function CandidateImage({
  worker,
  className,
  alt,
  locale = "ar",
  priority = false,
}: {
  worker: Pick<Worker, "id" | "full_name" | "nationality" | "photo_url" | "updated_at">;
  className?: string;
  alt?: string;
  locale?: "ar" | "en";
  priority?: boolean;
}) {
  const [status, setStatus] = useState<"loading" | "loaded" | "error">(
    worker.photo_url ? "loading" : "error"
  );
  const [bg, fg] = getColors(worker.nationality);
  const initials = getInitials(worker.full_name);
  const nationalityLabel = translateNationality(worker.nationality, locale);
  const altText = alt ?? `${worker.full_name} — ${nationalityLabel}`;

  // إذا لم توجد صورة أو كانت من pravatar (تجريبية)، اعرض الصورة الرمزية
  const isValidPhoto =
    worker.photo_url &&
    !worker.photo_url.includes("pravatar.cc") &&
    !worker.photo_url.includes("placehold.co");

  if (!isValidPhoto || status === "error") {
    return (
      <div
        className={`${styles.avatar} ${className ?? ""}`}
        style={{ background: `linear-gradient(135deg, ${bg}, ${fg})` }}
        role="img"
        aria-label={altText}
      >
        <span className={styles.initials}>{initials}</span>
        <span className={styles.nationality}>{nationalityLabel}</span>
      </div>
    );
  }

  // cache-busting: إلحاق ?v=<updated_at> يجعل next/image يُنتج نسخة محسّنة
  // جديدة عند تغيّر الصورة (عند تعديل المدير)، فينعكس التغيير للعميل فوراً.
  const version = worker.updated_at ?? worker.id;
  const sep = worker.photo_url!.includes("?") ? "&" : "?";
  const optimizedSrc = `${worker.photo_url}${sep}v=${encodeURIComponent(String(version))}`;

  return (
    <div className={`${styles.wrap} ${className ?? ""}`}>
      {status === "loading" && <div className={styles.skeleton} aria-hidden="true" />}
      <Image
        src={optimizedSrc}
        alt={altText}
        fill
        sizes="(max-width: 480px) 90vw, (max-width: 900px) 45vw, 300px"
        className={`${styles.image} ${status === "loaded" ? styles.visible : ""}`}
        loading={priority ? "eager" : "lazy"}
        priority={priority}
        onLoad={() => setStatus("loaded")}
        onError={() => setStatus("error")}
        unoptimized={false}
      />
    </div>
  );
}
