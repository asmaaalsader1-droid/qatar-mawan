import Link from "next/link";
import { ClockIcon, CalendarIcon, PlaneIcon, ShieldCheckIcon, SparklesIcon, HeadphonesIcon, CheckCircleIcon, ArrowLeftIcon } from "./MaawenIcons";
import styles from "./Maawen.module.css";

const SERVICES = [
  {
    id: "hourly",
    icon: <ClockIcon className="w-7 h-7" />,
    title: "عمالة منزلية بالساعة",
    desc: "خدمة مرنة لتنظيف وترتي منزلك بالساعة، مع إمكانية الحجز اليومي أو الأسبوعي حسب رغبتك.",
    points: ["من ساعتين فأكثر", "عمالة مدرّبة", "أدوات تنظيف متوفرة"],
    href: "candidates?employment=hourly",
    cta: "احجز الآن",
  },
  {
    id: "monthly",
    icon: <CalendarIcon className="w-7 h-7" />,
    title: "عمالة منزلية بالشهر",
    desc: "عاملة منزلية بدوام كامل أو جزئي على مدار الشهر، لراحة مستمرة لعائلتك ومنزلك.",
    points: ["عقد شهري مرن", "متابعة مستمرة", "بديلة عند الحاجة"],
    href: "candidates?employment=monthly",
    cta: "احجز الآن",
  },
  {
    id: "recruit",
    icon: <PlaneIcon className="w-7 h-7" />,
    title: "استقدام عمالة منزلية",
    desc: "استقدام مباشر من أفضل المصادر، مع تدقيق كامل للسير الذاتية وتدريب قبل الوصول.",
    points: ["إجراءات سريعة", "ضمان شامل", "خيارات جنسيات متعددة"],
    href: "candidates?employment=recruitment",
    cta: "اطلب الخدمة",
  },
];

const WHY_CARDS = [
  {
    num: "01",
    icon: <ShieldCheckIcon className="w-5 h-5" />,
    title: "موثوقية كاملة",
    desc: "عمالة مدققة الخلفية مع توثيق رسمي من وزارة العمل القطرية، وفحص طبي شامل قبل الوصول.",
  },
  {
    num: "02",
    icon: <SparklesIcon className="w-5 h-5" />,
    title: "جودة استثنائية",
    desc: "برامج تدريب مستمرة على أعلى المعايعات العالمية للخدمة المنزلية والعناية بالأطفال وكبار السن.",
  },
  {
    num: "03",
    icon: <HeadphonesIcon className="w-5 h-5" />,
    title: "دعم 24/7",
    desc: "فريق خدمة عملاء متواصل بالعربية والإنجليزية، يستجيب لاستفساراتك في أي وقت.",
  },
  {
    num: "04",
    icon: <CheckCircleIcon className="w-5 h-5" />,
    title: "ضمان الرضا",
    desc: "استبدال مجاني خلال 3 أشهر عند عدم الرضا، مع متابعة دورية لضمان استمرارية الخدمة.",
  },
];

const STATS = [
  { value: "+12", label: "سنة خبرة" },
  { value: "+5000", label: "عميل سعيد" },
  { value: "+800", label: "عامل مدرّب" },
  { value: "98%", label: "نسبة الرضا" },
];

export function HomeMaawen({ locale = "ar" }: { locale?: string }) {
  const prefix = `/${locale}`;
  return (
    <div className="container">
      {/* الهيرو */}
      <section className={styles.hero}>
        <span className={styles.tag}>خدماتنا</span>
        <h1 className={styles.heroTitle}>حلول شاملة لمنزلك</h1>
        <p className={styles.heroSubtitle}>نقدم أفضل خدمات العمالة المنزلية في قطر مع ضمان الجودة والكفاءة</p>

        <div className={styles.sponsors}>
          <strong className={styles.sponsorOoredoo}>ooredoo</strong>
          <span className={styles.sponsorLabor}>
            وزارة العمل
            <br />
            <small>State of Qatar</small>
          </span>
        </div>

        <div className={styles.servicePills}>
          <a href={`${prefix}/candidates?employment=hourly`} className={styles.pill}>عمالة بالساعة</a>
          <a href={`${prefix}/candidates?employment=monthly`} className={styles.pill}>عمالة بالشهر</a>
          <a href={`${prefix}/candidates?employment=recruitment`} className={styles.pill}>استقدام</a>
        </div>
      </section>

      {/* بطاقات الخدمات */}
      <section className={styles.services}>
        {SERVICES.map((s) => (
          <article key={s.id} id={`service-${s.id}`} className={styles.serviceCard}>
            <div className={styles.serviceIcon}>{s.icon}</div>
            <h3 className={styles.serviceTitle}>{s.title}</h3>
            <p className={styles.serviceDesc}>{s.desc}</p>
            <ul className={styles.serviceList}>
              {s.points.map((p) => (
                <li key={p} className={styles.serviceListItem}>
                  <CheckCircleIcon className="w-4 h-4 text-accent shrink-0" />
                  {p}
                </li>
              ))}
            </ul>
            <Link href={`${prefix}/${s.href}`} className={styles.serviceLink}>
              {s.cta}
              <ArrowLeftIcon className="w-4 h-4" />
            </Link>
          </article>
        ))}
      </section>

      {/* قسم راحة بيتك تبدأ مع معاون */}
      <section className={styles.heroSplit}>
        <div className={styles.whyBadgeWrap}>
          <span className={styles.whyBadge}>✦ مرخصة في دولة قطر</span>
          <h2 className={styles.whyTitle}>
            راحة بيتك تبدأ
            <br />
            <span className={styles.whyTitleAccent}>مع معاون</span>
          </h2>
          <p className={styles.whySubtitle}>
            الشركة القطرية لحلول القوى البشرية. نوفر لك عمالة منزلية موثوقة ومدربة، بالساعة أو بالشهر، مع خدمات استقدام احترافية تلبي معاييرك.
          </p>
          <div className={styles.heroCtas}>
            <Link href={`${prefix}/candidates`} className={styles.btnPillPrimary}>
              اكتشف خدماتنا <span>←</span>
            </Link>
            <Link href={`${prefix}/contact`} className={styles.btnPillOutline}>
              احجز استشارة
            </Link>
          </div>
        </div>

        <div className={styles.heroImage}>
          <img
            src="https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=800&q=80"
            alt="خدمات منزلية"
            className={styles.heroImg}
            loading="lazy"
            decoding="async"
          />
          <div className={styles.qualityBadge}>
            <div className={styles.qualityBadgeIcon}>✓</div>
            <div>
              <div className={styles.qualityBadgeTitle}>ضمان الجودة</div>
              <div className={styles.qualityBadgeSub}>عمالة موثقة ومدربة</div>
            </div>
          </div>
        </div>
      </section>

      {/* لماذا معاون */}
      <section className={styles.whySection}>
        <div>
          <span className={styles.whyBadge}>لماذا معاون</span>
          <h2 className={styles.whyTitle}>راحة بالك<br />أولويّتنا الأولى</h2>
          <p className={styles.whySubtitle}>نختار بعناية، ندرّب باحتراف، ونرافقك بعد التوظيف. لأن خدمة منزلك تبدأ بثقة لا تتزعزع.</p>
          <div className={styles.statsGrid}>
            {STATS.map((st) => (
              <div key={st.label} className={styles.statCard}>
                <div className={styles.statValue}>{st.value}</div>
                <div className={styles.statLabel}>{st.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.whyCards}>
          {WHY_CARDS.map((c) => (
            <div key={c.num} className={styles.whyCard}>
              <span className={styles.whyCardNum}>{c.num}</span>
              <div className={styles.whyCardInner}>
                <div className={styles.whyCardIcon}>{c.icon}</div>
                <div>
                  <h3 className={styles.whyCardTitle}>{c.title}</h3>
                  <p className={styles.whyCardDesc}>{c.desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}