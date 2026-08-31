"use client";

import { useEffect, useRef, useState } from "react";
import { Dictionary } from "@/lib/i18n";
import styles from "./Stats.module.css";

type StatsContent = {
  candidates: number;
  families: number;
  yearsExperience: number;
  rating: number;
};

export function Stats({ dict, content }: { dict: Dictionary; content?: StatsContent }) {
  const data = content ?? { candidates: 30, families: 250, yearsExperience: 10, rating: 4.8 };
  const items = [
    { value: data.candidates, label: dict.home.statsCandidates },
    { value: data.families, label: dict.home.statsFamilies },
    { value: data.yearsExperience, label: dict.home.statsYears },
    { value: data.rating, label: dict.home.statsRating, decimal: true },
  ];
  return (
    <section className={styles.stats}>
      <div className="container">
        <div className={styles.grid}>
          {items.map((item, i) => (
            <Counter key={i} value={item.value} label={item.label} decimal={item.decimal} />
          ))}
        </div>
      </div>
    </section>
  );
}

function Counter({ value, label, decimal }: { value: number; label: string; decimal?: boolean }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          const duration = 1200;
          const start = performance.now();
          const step = (now: number) => {
            const progress = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setDisplay(decimal ? +(eased * value).toFixed(1) : Math.floor(eased * value));
            if (progress < 1) requestAnimationFrame(step);
            else setDisplay(value);
          };
          requestAnimationFrame(step);
        }
      },
      { threshold: 0.3 },
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [value, decimal]);

  return (
    <div className={styles.item} ref={ref}>
      <span className={styles.value}>
        {decimal ? display.toFixed(1) : display}
        {label.includes("تقييم") || label.includes("rating") ? " ★" : "+"}
      </span>
      <span className={styles.label}>{label}</span>
    </div>
  );
}
