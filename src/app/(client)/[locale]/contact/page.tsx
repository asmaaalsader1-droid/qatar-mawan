import { getDictionary } from "@/lib/i18n";
import { Breadcrumb } from "@/components/client/Breadcrumb";
import { ContactForm } from "@/components/client/ContactForm";
import { Card } from "@/components/ui/Card";
import { SITE } from "@/config/site";
import { PinIcon, PhoneIcon, MailIcon } from "@/components/ui/Icons";
import styles from "./page.module.css";

export default async function ContactPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const dict = getDictionary(locale);
  const isAr = locale === "ar";
  const address = isAr ? SITE.addressAr : SITE.addressEn;

  return (
    <div className="container">
      <Breadcrumb locale={locale} homeLabel={dict.nav.home} items={[{ label: dict.nav.contact }]} />
      <h1 className={styles.title}>{dict.contact.title}</h1>
      <p className={styles.subtitle}>{dict.contact.subtitle}</p>

      <div className={styles.infoRow}>
        <Card>
          <h3 className={styles.infoTitle}><PinIcon className={styles.infoIcon} /> {isAr ? "العنوان" : "Address"}</h3>
          <p className={styles.infoText}>{address}</p>
        </Card>
        <Card>
          <h3 className={styles.infoTitle}><PhoneIcon className={styles.infoIcon} /> {isAr ? "الهاتف" : "Phone"}</h3>
          <p className={styles.infoText}><a href={`tel:${SITE.phone}`} dir="ltr">{SITE.phone}</a></p>
        </Card>
        <Card>
          <h3 className={styles.infoTitle}><MailIcon className={styles.infoIcon} /> {isAr ? "البريد" : "Email"}</h3>
          <p className={styles.infoText}><a href={`mailto:${SITE.email}`} dir="ltr">{SITE.email}</a></p>
        </Card>
      </div>

      <h2 className={styles.formTitle}>{dict.contact.formTitle}</h2>
      <ContactForm dict={dict} locale={locale} />
    </div>
  );
}
