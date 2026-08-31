import Link from "next/link";
import styles from "./Breadcrumb.module.css";

export type Crumb = { label: string; href?: string };

export function Breadcrumb({
  items,
  locale,
  homeLabel,
}: {
  items: Crumb[];
  locale: string;
  homeLabel?: string;
}) {
  const prefix = `/${locale}`;
  const home = homeLabel ?? (locale === "ar" ? "الرئيسية" : "Home");
  return (
    <nav className={styles.breadcrumb} aria-label="Breadcrumb">
      <ol>
        <li>
          <Link href={prefix}>{home}</Link>
        </li>
        {items.map((item, i) => (
          <li key={i}>
            <span className={styles.sep}>/</span>
            {item.href ? <Link href={`${prefix}${item.href}`}>{item.label}</Link> : <span className={styles.current}>{item.label}</span>}
          </li>
        ))}
      </ol>
    </nav>
  );
}
