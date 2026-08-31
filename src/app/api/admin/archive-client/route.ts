import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { archiveClient, unarchiveClient } from "@/lib/archive";

async function requireAdmin() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: setting } = await supabase
    .from("settings")
    .select("value")
    .eq("key", "admin_email")
    .maybeSingle();
  const adminEmail = (setting?.value as { email?: string })?.email;
  if (adminEmail && user.email === adminEmail) return user;
  return null;
}

// POST: أرشفة/إلغاء أرشفة عميل (منفصل عن الحظر)
export async function POST(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "غير مصرح" }, { status: 403 });

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });

  const { clientId, action } = body as { clientId?: string; action?: "archive" | "unarchive" };
  if (!clientId || (action !== "archive" && action !== "unarchive")) {
    return NextResponse.json({ error: "clientId و action مطلوبان" }, { status: 422 });
  }

  if (action === "archive") {
    await archiveClient(clientId);
  } else {
    await unarchiveClient(clientId);
  }

  return NextResponse.json({ ok: true });
}
