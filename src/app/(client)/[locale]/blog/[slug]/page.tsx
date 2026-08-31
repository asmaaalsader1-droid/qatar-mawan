import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getDictionary } from "@/lib/i18n";
import { Breadcrumb } from "@/components/client/Breadcrumb";
import Link from "next/link";
import styles from "./page.module.css";

export default async function BlogArticlePage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const dict = getDictionary(locale);

  const supabase = createClient();
  const { data: article } = await supabase
    .from("articles")
    .select("*")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  if (!article) notFound();

  const { data: related } = await supabase
    .from("articles")
    .select("slug, title, cover_image_url, summary")
    .eq("status", "published")
    .neq("id", article.id)
    .limit(3);

  return (
    <div className="container">
      <Breadcrumb locale={locale} homeLabel={dict.nav.home} items={[{ label: dict.nav.blog, href: "/blog" }, { label: article.title }]} />
      <article className={styles.article}>
        <img src={article.cover_image_url} alt={article.title} className={styles.cover} />
        <div className={styles.header}>
          {article.category && <span className={styles.category}>{article.category}</span>}
          <h1 className={styles.title}>{article.title}</h1>
          <time className={styles.date}>
            {article.published_at ? new Date(article.published_at).toLocaleDateString(locale === "ar" ? "ar-QA" : "en-QA") : ""}
          </time>
        </div>
        <div className={styles.content} dangerouslySetInnerHTML={{ __html: article.content_html }} />
      </article>

      {related && related.length > 0 && (
        <section className={styles.related}>
          <h2 className={styles.relatedTitle}>مقالات ذات صلة</h2>
          <div className="grid grid-3">
            {related.map((r) => (
              <Link href={`/${locale}/blog/${r.slug}`} key={r.slug}>
                <div className={styles.relatedCard}>
                  <img src={r.cover_image_url} alt={r.title} className={styles.relatedCover} />
                  <h3 className={styles.relatedName}>{r.title}</h3>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
