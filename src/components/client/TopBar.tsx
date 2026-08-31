import { SITE } from "@/config/site";
import { Dictionary } from "@/lib/i18n";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { QatarFlagIcon, PhoneIcon } from "@/components/ui/Icons";
import styles from "./TopBar.module.css";

export function TopBar({ locale, dict }: { locale: string; dict: Dictionary }) {
  const tagline = locale === "ar" ? SITE.taglineAr : SITE.taglineEn;
  const isAr = locale === "ar";
  return (
    <div className={styles.topbar}>
      <div className={`container ${styles.inner}`}>
        <span className={styles.flagWrap}>
          <QatarFlagIcon className={styles.flag} />
        </span>
        <span className={styles.text}>{isAr ? "شركة قطرية مرخّصة لحلول القوى البشرية — لوسيل، برج مارينا، ط 6" : "Licensed Qatari workforce solutions company — Lusail, Marina Tower, Fl 6"}</span>
        <div className={styles.actions}>
          <a href={`tel:${SITE.phone}`} className={styles.phone} aria-label={isAr ? "اتصل بنا" : "Call us"}>
            <PhoneIcon className={styles.phoneIcon} />
            <span dir="ltr">{SITE.phone}</span>
          </a>
          <LanguageSwitcher locale={locale} />
        </div>
      </div>
    </div>
  );
}
