import { getDictionary } from "@/lib/i18n";
import { Breadcrumb } from "@/components/client/Breadcrumb";
import { Card } from "@/components/ui/Card";
import { createClient } from "@/lib/supabase/server";
import styles from "./page.module.css";

const PRIVACY_FALLBACK: Record<string, { heading: string; body: string }[]> = {
  ar: [
    { heading: "1. البيانات التي نجمعها", body: "نجمع البيانات التي تقدمها طوعاً عبر النماذج (الاسم، الهاتف، البريد)، إضافة إلى بيانات تقنية (IP، بصمة المتصفح) لأغراض الأمان." },
    { heading: "2. كيف نستخدم بياناتك", body: "للتواصل معك بشأن طلبك، ولتحسين خدماتنا، ولمنع الإساءة." },
    { heading: "3. المشاركة مع الأطراف", body: "لا نشارك بياناتك مع أطراف ثالثة لأغراض تسويقية. قد نشاركها مع مقدمي الخدمة (مثل واتساب) لأداء الخدمة فقط." },
    { heading: "4. التخزين والحماية", body: "تُخزن البيانات في قواعد بيانات آمنة مع تشفير النقل، ونطبق ضوابط وصول صارمة." },
    { heading: "5. حقوقك", body: "لك الحق في الوصول لبياناتك وتصحيحها أو حذفها بطلب خطي." },
    { heading: "6. الكوكيز", body: "نستخدم كوكيز أساسية لعمل الموقع وتحسين التجربة." },
  ],
  en: [
    { heading: "1. Data We Collect", body: "We collect data you provide voluntarily via forms (name, phone, email), as well as technical data (IP, browser fingerprint) for security purposes." },
    { heading: "2. How We Use Your Data", body: "To contact you regarding your request, to improve our services, and to prevent abuse." },
    { heading: "3. Sharing with Third Parties", body: "We do not share your data with third parties for marketing. We may share it with service providers (e.g. WhatsApp) solely to deliver the service." },
    { heading: "4. Storage and Protection", body: "Data is stored in secure databases with encrypted transit, and we apply strict access controls." },
    { heading: "5. Your Rights", body: "You have the right to access, correct, or delete your data upon written request." },
    { heading: "6. Cookies", body: "We use essential cookies for the site to function and to improve your experience." },
  ],
};

export default async function PrivacyPage({
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
    .eq("page", "privacy")
    .eq("section", "body")
    .eq("locale", locale)
    .maybeSingle();

  const content = (row?.content as { html?: string })?.html;

  return (
    <div className="container">
      <Breadcrumb locale={locale} homeLabel={dict.nav.home} items={[{ label: dict.nav.privacy }]} />
      <h1 className={styles.title}>{dict.privacy.title}</h1>
      <Card className={styles.card}>
        {content ? (
          <div className={styles.content} dangerouslySetInnerHTML={{ __html: content }} />
        ) : (
          <div className={styles.content}>
            {PRIVACY_FALLBACK[locale].map((s, i) => (
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
