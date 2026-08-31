import { getDictionary } from "@/lib/i18n";
import styles from "./page.module.css";

export default async function BlockedPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const dict = getDictionary(locale);

  return (
    <div className={styles.wrapper}>
      <div className={styles.card}>
        <div className={styles.icon}>🚫</div>
        <h1 className={styles.title}>{dict.blocked.title}</h1>
        <p className={styles.message}>{dict.blocked.message}</p>
        <p className={styles.contact}>{dict.blocked.contact}</p>
        <a href="mailto:support@khdm-qatar.com" className={styles.email}>support@khdm-qatar.com</a>
      </div>
    </div>
  );
}
