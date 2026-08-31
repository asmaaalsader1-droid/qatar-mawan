import { getDictionary } from "@/lib/i18n";
import { Breadcrumb } from "@/components/client/Breadcrumb";
import { Card } from "@/components/ui/Card";
import { createClient } from "@/lib/supabase/server";
import styles from "./page.module.css";

const TERMS_FALLBACK: Record<string, { heading: string; body: string }[]> = {
  ar: [
    { heading: "1. قبول الشروط", body: "باستخدامك لموقعنا فإنك توافق على هذه الشروط والأحكام. يُرجى قراءتها بعناية." },
    { heading: "2. الخدمات", body: "نوفر خدمات الاستقدام والتوظيف المنزلي في قطر وفق الأنظمة والقوانين المعمول بها." },
    { heading: "3. المسؤوليات", body: "يتحمل العميل مسؤولية تقديم معلومات صحيحة، والالتزام بشروط الاستقدام المحلية." },
    { heading: "4. الرسوم", body: "تُطبق الرسوم المعروضة عند توقيع العقد. لا توجد رسوم خفية." },
    { heading: "5. سياسة الاسترجاع", body: "يُسمح باستبدال العاملة خلال فترة التجربة وفق سياسة الاسترجاع المعلنة لكل عاملة." },
    { heading: "6. الخصوصية", body: "نحترم خصوصيتك ونحمي بياناتك وفق سياسة الخصوصية المنشورة." },
    { heading: "7. التعديلات", body: "قد نُحدّث هذه الشروط من حين لآخر، ويسري التعديل فور نشره." },
  ],
  en: [
    { heading: "1. Acceptance of Terms", body: "By using our website you agree to these terms and conditions. Please read them carefully." },
    { heading: "2. Services", body: "We provide domestic worker recruitment and staffing services in Qatar in accordance with applicable laws and regulations." },
    { heading: "3. Responsibilities", body: "The client is responsible for providing accurate information and complying with local recruitment requirements." },
    { heading: "4. Fees", body: "The fees shown at contract signing apply. There are no hidden charges." },
    { heading: "5. Refund Policy", body: "A candidate may be replaced during the trial period according to the refund policy announced for each candidate." },
    { heading: "6. Privacy", body: "We respect your privacy and protect your data in accordance with the published privacy policy." },
    { heading: "7. Amendments", body: "We may update these terms from time to time, and amendments take effect upon publication." },
  ],
};

export default async function TermsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const dict = getDictionary(locale);

  const supabase = createClient();
  const { data: row } = await supabase
    .from("page_content")
    .select("content")
    .eq("page", "terms")
    .eq("section", "body")
    .eq("locale", locale)
    .maybeSingle();

  const content = (row?.content as { html?: string })?.html;

  return (
    <div className="container">
      <Breadcrumb locale={locale} homeLabel={dict.nav.home} items={[{ label: dict.nav.terms }]} />
      <h1 className={styles.title}>{dict.terms.title}</h1>
      <Card className={styles.card}>
        {content ? (
          <div className={styles.content} dangerouslySetInnerHTML={{ __html: content }} />
        ) : (
          <div className={styles.content}>
            {TERMS_FALLBACK[locale].map((s, i) => (
              <section key={i}>
                <h2>{s.heading}</h2>
                <p>{s.body}</p>
              </section>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
