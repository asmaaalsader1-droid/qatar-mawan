import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { getDictionary } from "@/lib/i18n";
import { CandidatesPageClient } from "@/components/client/CandidatesPageClient";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";

export default async function CandidatesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<{ employment?: string }>;
}) {
  const { locale } = await params;
  const { employment = "" } = (await searchParams) ?? {};
  const dict = getDictionary(locale);

  const supabase = createClient();
  let query = supabase
    .from("workers")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(12);
  const employmentValues = employment.split(",").map((value: string) => value.trim()).filter(Boolean);
  if (employmentValues.length > 0 && !employmentValues.includes("all")) {
    query = query.overlaps("employment_type", employmentValues);
  }
  const { data } = await query;

  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <CandidatesPageClient dict={dict} locale={locale} initial={data ?? []} />
    </Suspense>
  );
}
