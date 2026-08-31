import { getDictionary } from "@/lib/i18n";
import { AuthForm } from "@/components/client/AuthForm";

export default async function RegisterPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const dict = getDictionary(locale);
  return <AuthForm mode="register" dict={dict} locale={locale} />;
}
