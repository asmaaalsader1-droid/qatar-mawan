import { createClient } from "@/lib/supabase/server";
import { WorkersAdminClient } from "@/components/admin/WorkersAdminClient";

export default async function AdminWorkersPage() {
  const supabase = createClient();
  const { data: workers } = await supabase
    .from("workers")
    .select("*")
    .order("created_at", { ascending: false });

  return <WorkersAdminClient workers={workers ?? []} />;
}
