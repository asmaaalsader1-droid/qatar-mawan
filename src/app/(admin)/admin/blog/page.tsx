import { createClient } from "@/lib/supabase/server";
import { BlogAdminClient } from "@/components/admin/BlogAdminClient";

export default async function AdminBlogPage() {
  const supabase = createClient();
  const { data: articles } = await supabase
    .from("articles")
    .select("*")
    .order("created_at", { ascending: false });

  return <BlogAdminClient articles={articles ?? []} />;
}
