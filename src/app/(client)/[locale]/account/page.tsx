import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getDictionary } from "@/lib/i18n";
import { AccountClient } from "@/components/client/AccountClient";

export default async function AccountPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const dict = getDictionary(locale);

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect(`/${locale}/login`);

  const { data: bookings } = await supabase
    .from("bookings")
    .select("*, workers(*)")
    .order("created_at", { ascending: false });

  return <AccountClient user={user} bookings={bookings ?? []} dict={dict} locale={locale} />;
}
