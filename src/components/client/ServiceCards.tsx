import Link from "next/link";
import { Card } from "@/components/ui/Card";
import styles from "./ServiceCards.module.css";

const DEFAULT_SERVICES_AR = [
  { title: "إقامة كاملة", desc: "خادمة مقيمة بالمنزل على مدار اليوم.", slug: "full-time-live-in" },
  { title: "عاملات منزليات", desc: "للتنظيف والتدبير المنزلي.", slug: "housemaids" },
  { title: "تدريب", desc: "تأهيل قبل الاستقدام.", slug: "training" },
  { title: "توظيف وتعيين", desc: "إجراءات كاملة حتى الوصول.", slug: "recruitment" },
];

const DEFAULT_SERVICES_EN = [
  { title: "Full-time live-in", desc: "Live-in domestic worker around the clock.", slug: "full-time-live-in" },
  { title: "Housemaids", desc: "For cleaning and household management.", slug: "housemaids" },
  { title: "Training", desc: "Pre-arrival training and qualification.", slug: "training" },
  { title: "Recruitment & hiring", desc: "Full procedures until arrival.", slug: "recruitment" },
];

export function ServiceCards({ items, locale = "ar" }: { items?: { title: string; desc: string }[]; locale?: string }) {
  const defaults = locale === "ar" ? DEFAULT_SERVICES_AR : DEFAULT_SERVICES_EN;
  const services = items ?? defaults;
  const prefix = `/${locale}`;
  return (
    <div className="grid grid-4">
      {services.map((service, i) => {
        const slug = defaults[i]?.slug ?? "";
        return (
          <Link href={`${prefix}/services/${slug}`} key={i}>
            <Card className={styles.card}>
              <div className={styles.icon}>✦</div>
              <h3 className={styles.title}>{service.title}</h3>
              <p className={styles.desc}>{service.desc}</p>
              <span className={styles.link}>{locale === "ar" ? "التفاصيل ←" : "Details →"}</span>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}
