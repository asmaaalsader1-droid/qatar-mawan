import { createClient } from "@/lib/supabase/server";
import { BlockClientClient } from "@/components/admin/BlockClientClient";

export default async function BlockClientPage() {
  const supabase = createClient();
  const { data: recentClients } = await supabase
    .from("clients")
    .select("id, name, email, phone, ip, country, fingerprint, created_at, is_blocked")
    .order("created_at", { ascending: false })
    .limit(20);

  const { data: blocked } = await supabase
    .from("blocked_clients")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <BlockClientClient recentClients={recentClients ?? []} blocked={blocked ?? []} />
  );
}
