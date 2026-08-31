import styles from "./LoadingSkeleton.module.css";

export function LoadingSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className={styles.grid}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={styles.card}>
          <div className={`${styles.line} ${styles.image}`} />
          <div className={`${styles.line} ${styles.title}`} />
          <div className={`${styles.line} ${styles.short}`} />
          <div className={`${styles.line} ${styles.short}`} />
        </div>
      ))}
    </div>
  );
}
