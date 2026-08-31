import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient, broadcastEntryStatus } from "@/lib/supabase/server";

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

// قرار المدير على طلب رمز التحقق: approve / reject
export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    entryId?: string;
    decision?: string;
  };
  const entryId = body.entryId;
  const decision = body.decision;

  if (!entryId || (decision !== "approve" && decision !== "reject")) {
    return NextResponse.json({ error: "invalid_params" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { data: entry, error: fErr } = await supabase
    .from("client_data_entries")
    .select("id, client_id, payload")
    .eq("id", entryId)
    .maybeSingle();

  if (fErr || !entry) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const payload = entry.payload as Record<string, unknown>;
  const newStatus = decision === "approve" ? "approved" : "rejected";

  const { error: uErr } = await supabase
    .from("client_data_entries")
    .update({
      payload: {
        ...payload,
        status: newStatus,
        admin_decided_at: new Date().toISOString(),
        admin_email: admin.email,
      },
    })
    .eq("id", entryId);

  if (uErr) {
    return NextResponse.json({ error: "update_failed" }, { status: 500 });
  }

  // عند الموافقة: حدّث الحجز إلى "paid"
  if (decision === "approve") {
    const bookingId = payload.booking_id as string | undefined;
    if (bookingId) {
      await supabase.from("bookings").update({ status: "paid" }).eq("id", bookingId);
    }
  }

  // بثّ الإشعار الفوري للعميل على قناة الـ entry.
  await broadcastEntryStatus(entryId, newStatus);

  return NextResponse.json({ status: newStatus });
}
