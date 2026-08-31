import { getDictionary } from "@/lib/i18n";
import { Breadcrumb } from "@/components/client/Breadcrumb";
import { Card } from "@/components/ui/Card";
import { SITE } from "@/config/site";
import styles from "./page.module.css";

export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const dict = getDictionary(locale);
  const isAr = locale === "ar";
  const brandName = isAr ? SITE.nameAr : SITE.nameEn;
  const tagline = isAr ? SITE.taglineAr : SITE.taglineEn;
  const address = isAr ? SITE.addressAr : SITE.addressEn;

  return (
    <div className="container">
      <Breadcrumb locale={locale} homeLabel={dict.nav.home} items={[{ label: dict.nav.about }]} />
      <h1 className={styles.title}>{dict.about.title}</h1>
      <p className={styles.lead}>{dict.about.lead}</p>

      <div className={styles.stats}>
        <div className={styles.stat}>
          <span className={styles.statValue}>{SITE.yearsExperience}+</span>
          <span className={styles.statLabel}>{isAr ? "سنوات خبرة" : "Years of experience"}</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statValue}>{SITE.familiesCount}+</span>
          <span className={styles.statLabel}>{isAr ? "عائلة سعيدة" : "Happy families"}</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statValue}>{SITE.workersCount}+</span>
          <span className={styles.statLabel}>{isAr ? "عاملة موثّقة" : "Verified workers"}</span>
        </div>
      </div>

      <div className={styles.values}>
        <Card>
          <h3>{isAr ? "🎯 رؤيتنا" : "🎯 Our vision"}</h3>
          <p>{isAr ? "أن نكون المكتب الأول في قطر للاستقدام المنزلي الموثوق." : "To be the leading trusted domestic recruitment office in Qatar."}</p>
        </Card>
        <Card>
          <h3>{isAr ? "🤝 رسالتنا" : "🤝 Our mission"}</h3>
          <p>{isAr ? "ربط الأسر بعاملات مؤهلات بشفافية كاملة واحترام لكرامة العاملة." : "Connecting families with qualified workers with full transparency and respect for workers' dignity."}</p>
        </Card>
        <Card>
          <h3>{isAr ? "⭐ قيمنا" : "⭐ Our values"}</h3>
          <p>{isAr ? "الشفافية، الاحترام، الجودة، الالتزام بالقانون." : "Transparency, respect, quality, and compliance with the law."}</p>
        </Card>
      </div>

      <h2 className={styles.sectionTitle}>{isAr ? "معلومات عن المكتب" : "Office information"}</h2>
      <div className={styles.info}>
        <p><strong>{isAr ? "الاسم" : "Name"}:</strong> {brandName}</p>
        <p><strong>{isAr ? "الوصف" : "Description"}:</strong> {tagline}</p>
        <p><strong>{isAr ? "السجل التجاري" : "Commercial registration"}:</strong> {SITE.commercialRegistration}</p>
        <p><strong>{isAr ? "رقم الترخيص" : "License number"}:</strong> {SITE.licenseNumber}</p>
        <p><strong>{isAr ? "العنوان" : "Address"}:</strong> {address}</p>
        <p><strong>{isAr ? "الهاتف" : "Phone"}:</strong> <a href={`tel:${SITE.phone}`} dir="ltr">{SITE.phone}</a></p>
        <p><strong>{isAr ? "البريد" : "Email"}:</strong> <a href={`mailto:${SITE.email}`} dir="ltr">{SITE.email}</a></p>
      </div>
    </div>
  );
}
