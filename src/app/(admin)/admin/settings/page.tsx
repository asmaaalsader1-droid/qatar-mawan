import { createClient } from "@/lib/supabase/server";
import { SettingsAdminClient } from "@/components/admin/SettingsAdminClient";

export default async function AdminSettingsPage() {
  const supabase = createClient();
  const { data: settings } = await supabase
    .from("settings")
    .select("*")
    .order("key", { ascending: true });

  return <SettingsAdminClient settings={settings ?? []} />;
}
