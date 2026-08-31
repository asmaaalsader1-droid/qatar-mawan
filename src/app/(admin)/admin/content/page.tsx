import { createClient } from "@/lib/supabase/server";
import { ContentAdminClient } from "@/components/admin/ContentAdminClient";

export default async function AdminContentPage() {
  const supabase = createClient();
  const { data: pages } = await supabase
    .from("page_content")
    .select("*")
    .order("page", { ascending: true });

  return <ContentAdminClient pages={pages ?? []} />;
}
