import { notFound } from "next/navigation";
import { getDictionary } from "@/lib/i18n";
import { Breadcrumb } from "@/components/client/Breadcrumb";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { CheckIcon } from "@/components/ui/Icons";
import styles from "./page.module.css";

const SERVICES_AR: Record<string, { title: string; desc: string; points: string[] }> = {
  "full-time-live-in": {
    title: "إقامة كاملة",
    desc: "خادمة مقيمة بالمنزل على مدار اليوم بكفالة كاملة من الاستقدام حتى انتهاء العقد.",
    points: ["استقدام كامل ضمن القانون القطري", "كفالة سنوية وتأمين صحي", "بديلة خلال فترة التجربة", "دعم متواصل بعد الوصول"],
  },
  housemaids: {
    title: "عاملات منزليات",
    desc: "للتنظيف والتدبير المنزلي والاعتناء بالأطفال وكل المهام المنزلية.",
    points: ["مهارات تنظيف متخصصة", "تجربة موثقة في منازل خليجية", "تدريب على استخدام الأجهزة", "إتقان مهارات أساسية في رعاية الأطفال"],
  },
  training: {
    title: "تدريب وتأهيل",
    desc: "تأهيل قبل الاستقدام على المهارات المنزلية واللغة والثقافة.",
    points: ["تدريب لغوي أساسي", "محو أمية الأجهزة المنزلية", "تعريف بالثقافة المحلية", "تقييم قبل الإرسال"],
  },
  recruitment: {
    title: "توظيف وتعيين",
    desc: "إجراءات كاملة حتى وصول العاملة إلى منزلك، مع متابعة بعد الوصول.",
    points: ["مطابقة الطلب بالعاملة", "إنهاء الإجراءات القانونية", "تذاكر السفر والاستقبال", "متابعة بعد الوصول"],
  },
};

const SERVICES_EN: Record<string, { title: string; desc: string; points: string[] }> = {
  "full-time-live-in": {
    title: "Full-time live-in",
    desc: "A live-in domestic worker around the clock with full sponsorship from recruitment until contract end.",
    points: ["Full recruitment under Qatari law", "Annual sponsorship and health insurance", "Replacement during probation", "Continuous support after arrival"],
  },
  housemaids: {
    title: "Housemaids",
    desc: "For cleaning, household management, childcare, and all domestic tasks.",
    points: ["Specialized cleaning skills", "Proven experience in Gulf households", "Appliance usage training", "Basic childcare proficiency"],
  },
  training: {
    title: "Training & qualification",
    desc: "Pre-arrival training in domestic skills, language, and culture.",
    points: ["Basic language training", "Appliance literacy", "Local culture orientation", "Pre-departure assessment"],
  },
  recruitment: {
    title: "Recruitment & hiring",
    desc: "Full procedures until the candidate arrives at your home, with post-arrival follow-up.",
    points: ["Matching the request to the candidate", "Completing legal procedures", "Travel tickets and reception", "Post-arrival follow-up"],
  },
};

export default async function ServiceDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const dict = getDictionary(locale);
  const isAr = locale === "ar";
  const SERVICES = isAr ? SERVICES_AR : SERVICES_EN;
  const service = SERVICES[slug];
  if (!service) notFound();

  return (
    <div className="container">
      <Breadcrumb locale={locale} homeLabel={dict.nav.home} items={[{ label: dict.common.services, href: "/services" }, { label: service.title }]} />
      <h1 className={styles.title}>{service.title}</h1>
      <p className={styles.desc}>{service.desc}</p>

      <Card className={styles.points}>
        <h2 className={styles.sectionTitle}>{isAr ? "ما الذي يميز خدمتنا" : "What makes our service different"}</h2>
        <ul className={styles.list}>
          {service.points.map((p, i) => (
            <li key={i}><CheckIcon className={styles.checkIcon} /> {p}</li>
          ))}
        </ul>
      </Card>

      <div className={styles.cta}>
        <Button href={`/${locale}/candidates`} size="lg">{dict.nav.browseCandidates}</Button>
        <Button href={`/${locale}/contact`} variant="outline" size="lg">{dict.nav.freeQuote}</Button>
      </div>
    </div>
  );
}
