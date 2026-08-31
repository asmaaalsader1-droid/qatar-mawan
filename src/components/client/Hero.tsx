"use client";

import { Button } from "@/components/ui/Button";
import { Dictionary } from "@/lib/i18n";
import { CheckIcon } from "@/components/ui/Icons";
import styles from "./Hero.module.css";

type HeroContent = {
  title: string;
  highlight: string;
  subtitle: string;
};

export function Hero({ dict, locale, content }: { dict: Dictionary; locale: string; content?: HeroContent }) {
  const isAr = locale === "ar";
  const title = content?.title ?? (isAr ? "رحّب بمساعدة موثوقة تناسب منزلك في قطر" : "Welcome reliable help that fits your home in Qatar");
  const highlight = content?.highlight ?? (isAr ? "موثوقة" : "reliable");
  const subtitle =
    content?.subtitle ??
    (isAr
      ? "مكتب استقدام مرخّص ومعتمد يوفر لك عاملات موثّقات بملفات واضحة وشروط صريحة."
      : "A licensed and approved office providing verified candidates with clear profiles and transparent terms.");
  const prefix = `/${locale}`;

  const parts = title.split(highlight);

  return (
    <section className={styles.hero}>
      <div className={`container ${styles.inner}`}>
        <div className={styles.text}>
          <h1 className={styles.title}>
            {parts[0]}
            <span className={styles.highlight}>{highlight}</span>
            {parts[1] ?? ""}
          </h1>
          <p className={styles.subtitle}>{subtitle}</p>
          <div className={styles.ctas}>
            <Button href={`${prefix}/candidates`} size="lg">
              {isAr ? "عرض العاملات" : dict.nav.browseCandidates}
            </Button>
          </div>
          <div className={styles.trust}>
            <span><CheckIcon className={styles.trustIcon} /> {dict.home.trustBadge1}</span>
            <span><CheckIcon className={styles.trustIcon} /> {dict.home.trustBadge2}</span>
            <span><CheckIcon className={styles.trustIcon} /> {dict.home.trustBadge3}</span>
          </div>
        </div>
        <div className={styles.visual}>
          <div className={styles.card}>
            <div className={styles.badge}>{isAr ? "موثّق" : "Verified"} <CheckIcon className={styles.badgeIcon} /></div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className={styles.heroImage}
              src="https://rozana-manpower.com/images/hero.webp"
              alt={isAr ? "عاملات موثّقات" : "Verified workers"}
              loading="eager"
              width={640}
              height={720}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
