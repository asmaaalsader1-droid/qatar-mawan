import { createClient } from "@/lib/supabase/server";
import { getDictionary } from "@/lib/i18n";
import { Breadcrumb } from "@/components/client/Breadcrumb";
import Link from "next/link";
import styles from "./page.module.css";

export default async function BlogPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const dict = getDictionary(locale);

  const supabase = createClient();
  const { data: articles } = await supabase
    .from("articles")
    .select("*")
    .eq("status", "published")
    .order("published_at", { ascending: false });

  return (
    <div className="container">
      <Breadcrumb locale={locale} homeLabel={dict.nav.home} items={[{ label: dict.nav.blog }]} />
      <h1 className={styles.title}>{dict.blog.title}</h1>
      <p className={styles.subtitle}>{dict.blog.subtitle}</p>
      <div className="grid grid-3">
        {(articles ?? []).map((article) => (
          <Link href={`/${locale}/blog/${article.slug}`} key={article.id}>
            <article className={styles.card}>
              <img src={article.cover_image_url} alt={article.title} className={styles.cover} />
              <div className={styles.body}>
                {article.category && <span className={styles.category}>{article.category}</span>}
                <h2 className={styles.cardTitle}>{article.title}</h2>
                <p className={styles.excerpt}>{article.summary}</p>
                <time className={styles.date}>
                  {article.published_at ? new Date(article.published_at).toLocaleDateString(locale === "ar" ? "ar-QA" : "en-QA") : ""}
                </time>
              </div>
            </article>
          </Link>
        ))}
      </div>
    </div>
  );
}
