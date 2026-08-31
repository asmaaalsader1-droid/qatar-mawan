import { createClient } from "@/lib/supabase/server";
import { getDictionary } from "@/lib/i18n";
import { Breadcrumb } from "@/components/client/Breadcrumb";
import { CandidateCard } from "@/components/client/CandidateCard";
import styles from "./page.module.css";

const NAT_TITLE: Record<string, { ar: string; en: string; dbValue: string }> = {
  filipina: { ar: "مساعدات فلبينيات", en: "Filipina maids", dbValue: "فلبينية" },
  ethiopian: { ar: "مساعدات إثيوبيات", en: "Ethiopian maids", dbValue: "إثيوبية" },
  ugandan: { ar: "مساعدات أوغنديات", en: "Ugandan maids", dbValue: "أوغندية" },
};

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ locale: string; nationality: string }>;
}) {
  const { locale, nationality } = await params;
  const dict = getDictionary(locale);
  const isAr = locale === "ar";
  const meta = NAT_TITLE[nationality];
  const title = meta ? (isAr ? meta.ar : meta.en) : nationality;
  const dbValue = meta?.dbValue ?? nationality;

  const supabase = createClient();
  const { data: workers } = await supabase
    .from("workers")
    .select("*")
    .eq("nationality", dbValue)
    .order("created_at", { ascending: false });

  return (
    <div className="container">
      <Breadcrumb locale={locale} homeLabel={dict.nav.home} items={[{ label: dict.common.candidates, href: "/candidates" }, { label: title }]} />
      <h1 className={styles.title}>{title}</h1>
      <p className={styles.count}>
        {workers?.length ?? 0} {dict.common.candidate}
      </p>
      <div className="grid grid-3">
        {(workers ?? []).map((w) => (
          <CandidateCard key={w.id} worker={w} dict={dict} locale={locale} />
        ))}
      </div>
    </div>
  );
}
