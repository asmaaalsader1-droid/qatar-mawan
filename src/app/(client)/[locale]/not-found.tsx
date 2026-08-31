import Link from "next/link";
import { getDictionary } from "@/lib/i18n";
import styles from "./not-found.module.css";

export default async function NotFound({ params }: { params?: { locale?: string } }) {
  const locale = params?.locale ?? "ar";
  const dict = getDictionary(locale);

  return (
    <div className={styles.wrapper}>
      <div className={styles.card}>
        <div className={styles.code}>404</div>
        <h1 className={styles.title}>الصفحة غير موجودة</h1>
        <p className={styles.desc}>
          عذراً، الصفحة التي تبحث عنها غير متوفرة أو تم نقلها.
        </p>
        <Link href={`/${locale}`} className={styles.link}>← العودة للرئيسية</Link>
      </div>
    </div>
  );
}
