import Link from "next/link";
import { SITE } from "@/config/site";
import { BackIcon, MapPinIcon } from "./MaawenIcons";
import styles from "./MaawenLayout.module.css";

/** رأس صفحة الحجز: زر رجوع + الشعار */
export function PageHeader({ isAr = true, locale = "ar" }: { isAr?: boolean; locale?: string }) {
  return (
    <header className={styles.pageHeader}>
      <Link href={`/${locale}`} className={styles.backBtn} aria-label={isAr ? "رجوع" : "Back"}>
        <BackIcon />
      </Link>
      <div className={styles.brandBlock}>
        <div className={styles.brandName}>{isAr ? SITE.nameAr : SITE.nameEn}</div>
        <span className={styles.brandSub}>{isAr ? "Ma'awen" : "معاون"}</span>
      </div>
    </header>
  );
}

/** أحد روابط الفوتر */
function FooterCol({
  title,
  links,
}: {
  title: string;
  links: { href: string; label: string }[];
}) {
  return (
    <div>
      <h4 className={styles.footerTitle}>{title}</h4>
      <ul className={styles.footerLinks}>
        {links.map((l) => (
          <li key={l.href + l.label}>
            <Link href={l.href} className={styles.footerLink}>{l.label}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** فوتر صفحات معاون */
export function PageFooter({ isAr = true, locale = "ar" }: { isAr?: boolean; locale?: string }) {
  const year = new Date().getFullYear();
  const brand = isAr ? SITE.nameAr : SITE.nameEn;
  return (
    <footer className={styles.pageFooter}>
      <div className={styles.footerGrid}>
        <div>
          <div className={styles.brandBlock}>
            <div className={styles.brandName}>{brand}</div>
            <span className={styles.brandSub}>{isAr ? "Ma'awen" : "معاون"}</span>
          </div>
          <p className={styles.footerDesc}>
            {isAr
              ? "الشركة القطرية لحلول القوى البشرية. نوفّر لك عمالة منزلية موثوقة ومدرّبة بأعلى معايير الجودة في قطر."
              : "Qatar workforce solutions company. We provide reliable, trained domestic staff to the highest quality standards in Qatar."}
          </p>
        </div>
        <FooterCol
          title={isAr ? "روابط سريعة" : "Quick links"}
          links={[
            { href: `/${locale}`, label: isAr ? "الرئيسية" : "Home" },
            { href: `/${locale}/candidates`, label: isAr ? "العاملات" : "Candidates" },
            { href: `/${locale}/candidates?employment=hourly`, label: isAr ? "عمالة بالساعة" : "Hourly staff" },
            { href: `/${locale}/candidates?employment=monthly`, label: isAr ? "عمالة بالشهر" : "Monthly staff" },
            { href: `/${locale}/candidates?employment=recruitment`, label: isAr ? "استقدام" : "Recruitment" },
          ]}
        />
        <FooterCol
          title={isAr ? "خدماتنا" : "Our services"}
          links={[
            { href: `/${locale}/candidates?employment=hourly`, label: isAr ? "عمالة بالساعة" : "Hourly staff" },
            { href: `/${locale}/candidates?employment=monthly`, label: isAr ? "عمالة بالشهر" : "Monthly staff" },
            { href: `/${locale}/candidates?employment=recruitment`, label: isAr ? "استقدام عمالة" : "Recruitment" },
          ]}
        />
        <div>
          <h4 className={styles.footerTitle}>{isAr ? "معلومات الاتصال" : "Contact info"}</h4>
          <ul className={styles.footerLinks}>
            <li className={styles.footerAddr}>
              <MapPinIcon className={styles.addrIcon} />
              <span>{isAr ? "لوسيل — برج مارينا — ط 6" : "Lusail — Marina Tower — Fl 6"}</span>
            </li>
            <li>
              <a href={`mailto:${SITE.email}`} className={styles.footerLink} dir="ltr">{SITE.email}</a>
            </li>
            <li>
              <a href={`tel:${SITE.phone}`} className={styles.footerLink} dir="ltr">{SITE.phone}</a>
            </li>
          </ul>
        </div>
      </div>
      <div className={styles.footerBottom}>
        © {year} {brand} {isAr ? "لخدمات القوى البشرية. جميع الحقوق محفوظة." : "Workforce solutions. All rights reserved."}
      </div>
    </footer>
  );
}