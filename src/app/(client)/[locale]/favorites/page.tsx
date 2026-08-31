import { getDictionary } from "@/lib/i18n";
import { Breadcrumb } from "@/components/client/Breadcrumb";
import { FavoritesClient } from "@/components/client/FavoritesClient";

export default async function FavoritesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const dict = getDictionary(locale);

  return (
    <div>
      <div className="container">
        <Breadcrumb locale={locale} homeLabel={dict.nav.home} items={[{ label: dict.favorites.title }]} />
      </div>
      <FavoritesClient dict={dict} locale={locale} />
    </div>
  );
}
