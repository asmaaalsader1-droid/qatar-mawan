import { NextRequest, NextResponse } from "next/server";
import { createServiceClient, createClient } from "@/lib/supabase/server";

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

export async function POST(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "غير مصرح" }, { status: 403 });

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });

  // يقبل إما (ip + fingerprint) مباشرة، أو clientId (من الواجهة) فنبحث عن بيانات العميل.
  let { ip, fingerprint, reason, clientId } = body as {
    ip?: string | null;
    fingerprint?: string | null;
    reason?: string | null;
    clientId?: string;
  };

  if (clientId && (!ip || !fingerprint)) {
    const supabase = createServiceClient();
    const { data: c } = await supabase
      .from("clients")
      .select("fingerprint, ip")
      .eq("id", clientId)
      .maybeSingle();
    if (c) {
      fingerprint = fingerprint ?? c.fingerprint;
      ip = ip ?? c.ip;
    }
  }

  if (!ip && !fingerprint) {
    return NextResponse.json({ error: "ip أو fingerprint أو clientId مطلوب" }, { status: 422 });
  }

  const supabase = createServiceClient();

  // ابحث أولاً عن سجل حظر موجود بنفس البصمة لتفادي التكرار.
  let blockedId: string | null = null;
  if (fingerprint) {
    const { data: existing } = await supabase
      .from("blocked_clients")
      .select("id")
      .eq("fingerprint", fingerprint)
      .maybeSingle();
    if (existing) blockedId = existing.id;
  }

  if (blockedId) {
    // حدّث السجل الموجود
    await supabase
      .from("blocked_clients")
      .update({ ip: ip ?? null, fingerprint: fingerprint ?? null, reason: reason ?? null })
      .eq("id", blockedId);
  } else {
    const { error } = await supabase.from("blocked_clients").insert({
      ip: ip ?? null,
      fingerprint: fingerprint ?? null,
      reason: reason ?? null,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // علّم العميل محظوراً إن وُجد.
  if (fingerprint) {
    await supabase.from("clients").update({ is_blocked: true }).eq("fingerprint", fingerprint);
  } else if (ip) {
    await supabase.from("clients").update({ is_blocked: true }).eq("ip", ip);
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "غير مصرح" }, { status: 403 });

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });

  const { id, fingerprint, clientId } = body as {
    id?: string;
    fingerprint?: string;
    clientId?: string;
  };

  const supabase = createServiceClient();

  // إن أُعطي clientId، ابحث عن البصمة المرتبطة.
  let fp = fingerprint ?? null;
  if (clientId && !fp) {
    const { data: c } = await supabase
      .from("clients")
      .select("fingerprint")
      .eq("id", clientId)
      .maybeSingle();
    fp = c?.fingerprint ?? null;
  }

  // إن أُعطي id مباشرة (سجل الحظر)
  let recordFp = fp;
  let recordIp: string | null = null;
  if (id) {
    const { data: record } = await supabase
      .from("blocked_clients")
      .select("fingerprint, ip")
      .eq("id", id)
      .maybeSingle();
    if (record) {
      recordFp = recordFp ?? record.fingerprint;
      recordIp = record.ip;
    }
  } else if (fp) {
    // ابحث عن سجل الحظر بالبصمة
    const { data: record } = await supabase
      .from("blocked_clients")
      .select("id, fingerprint, ip")
      .eq("fingerprint", fp)
      .maybeSingle();
    if (record) {
      // احذفه باستخدام id
      await supabase.from("blocked_clients").delete().eq("id", record.id);
    }
  }

  // ألغِ الحظر عن العميل
  if (recordFp) {
    await supabase.from("clients").update({ is_blocked: false }).eq("fingerprint", recordFp);
  } else if (recordIp) {
    await supabase.from("clients").update({ is_blocked: false }).eq("ip", recordIp);
  }

  if (id) {
    const { error } = await supabase.from("blocked_clients").delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
