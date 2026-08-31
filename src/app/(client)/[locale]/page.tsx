import { getDictionary } from "@/lib/i18n";
import { HomeMaawen } from "@/components/maawen/HomeMaawen";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const dict = getDictionary(locale);
  const isAr = locale === "ar";

  return (
    <div>
      <HomeMaawen locale={locale} />
    </div>
  );
}
