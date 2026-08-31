import Link from "next/link";
import Image from "next/image";
import { SITE } from "@/config/site";
import { Dictionary } from "@/lib/i18n";
import styles from "./Footer.module.css";

export function Footer({ dict, locale }: { dict: Dictionary; locale: string }) {
  const prefix = `/${locale}`;
  const year = new Date().getFullYear();
  const isAr = locale === "ar";
  const brandName = isAr ? SITE.nameAr : SITE.nameEn;
  const tagline = isAr ? "الشركة القطرية لحلول القوى البشرية. نوفّر لك عمالة منزلية موثوقة ومدرّبة بأعلى معايير الجودة في قطر." : "Qatar workforce solutions company. We provide reliable, trained domestic staff to the highest quality standards in Qatar.";
  const address = isAr ? SITE.addressAr : SITE.addressEn;
  const workingHours = isAr ? SITE.workingHoursAr : SITE.workingHoursEn;
  return (
    <footer className={styles.footer}>
      <div className={`container ${styles.grid}`}>
        <div className={styles.col}>
          <div className={styles.brandWrap}>
            <Image
              src="/logo.png"
              alt={brandName}
              width={689}
              height={362}
              className={styles.logoImage}
            />
          </div>
          <p className={styles.desc}>{tagline}</p>
          <p className={styles.text}>{address}</p>
          <p className={styles.text}>{workingHours}</p>
        </div>

        <div className={styles.col}>
          <h4 className={styles.title}>{isAr ? "روابط سريعة" : "Quick links"}</h4>
          <ul className={styles.links}>
            <li><Link href={`${prefix}`}>{dict.common.home}</Link></li>
            <li><Link href={`${prefix}/candidates`}>{isAr ? "العاملات" : "Candidates"}</Link></li>
            <li><Link href={`${prefix}/candidates?employment=hourly`}>{isAr ? "عمالة بالساعة" : "Hourly staff"}</Link></li>
            <li><Link href={`${prefix}/candidates?employment=monthly`}>{isAr ? "عمالة بالشهر" : "Monthly staff"}</Link></li>
            <li><Link href={`${prefix}/candidates?employment=recruitment`}>{isAr ? "استقدام" : "Recruitment"}</Link></li>
          </ul>
        </div>

        <div className={styles.col}>
          <h4 className={styles.title}>{dict.footer.company}</h4>
          <ul className={styles.links}>
            <li><Link href={`${prefix}/about`}>{dict.common.about}</Link></li>
            <li><Link href={`${prefix}/services`}>{dict.common.services}</Link></li>
            <li><Link href={`${prefix}/blog`}>{dict.common.blog}</Link></li>
            <li><Link href={`${prefix}/terms`}>{dict.common.terms || "الشروط"}</Link></li>
            <li><Link href={`${prefix}/privacy`}>{dict.common.privacy || "الخصوصية"}</Link></li>
          </ul>
        </div>

        <div className={styles.col}>
          <h4 className={styles.title}>{dict.newsletter.title}</h4>
          <form className={styles.news} action="/api/newsletter" method="POST">
            <input name="email" type="email" placeholder={dict.newsletter.placeholder} className={styles.input} required aria-label={dict.newsletter.placeholder} />
            <button type="submit" className={styles.btn}>{dict.newsletter.subscribe}</button>
          </form>
          <div className={styles.social}>
            <a href={SITE.social.facebook} aria-label="Facebook">f</a>
            <a href={SITE.social.instagram} aria-label="Instagram">ig</a>
            <a href={SITE.social.linkedin} aria-label="LinkedIn">in</a>
            <a href={SITE.social.tiktok} aria-label="TikTok">tt</a>
          </div>
        </div>
      </div>
      <div className={styles.bottom}>
        <div className={`container`}>
          <p>{dict.footer.rights.replace("{{year}}", String(year)).replace("{{name}}", brandName)}</p>
        </div>
      </div>
    </footer>
  );
}
