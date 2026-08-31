import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const entryId = req.nextUrl.searchParams.get("entryId");
  if (!entryId) {
    return NextResponse.json({ error: "missing_entry_id" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { data: entry, error } = await supabase
    .from("client_data_entries")
    .select("id, payload")
    .eq("id", entryId)
    .maybeSingle();

  if (error || !entry) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const payload = entry.payload as Record<string, unknown>;
  const status = (payload.status as string) ?? "pending_admin";

  return NextResponse.json(
    { status },
    { headers: { "Cache-Control": "no-store, max-age=0" } },
  );
}
