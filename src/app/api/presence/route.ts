import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { detectDevice, detectCountry, lookupCountryByIp } from "@/lib/client-info";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });

  const { fingerprint, ip: bodyIp, country: bodyCountry, device: bodyDevice, ua, path } = body as {
    fingerprint?: string;
    ip?: string | null;
    country?: string | null;
    device?: string | null;
    ua?: string | null;
    /** المسار الحالي للعميل (بدون لغة عادةً) — يعرضه المدير في لوحة التحكم. */
    path?: string | null;
  };

  if (!fingerprint) return NextResponse.json({ error: "fingerprint مطلوب" }, { status: 422 });

  const supabase = createServiceClient();

  // مصادر موثوقة من جهة الخادم (تفضّل على قيم العميل)
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    bodyIp ||
    null;
  // الدولة: نُفضّل ipinfo.io (دقيق ومستقل عن مزوّد الاستضافة)،
  // ثم ترويسات Geo (Vercel/Cloudflare...)، ثم قيمة العميل،
  // وأخيراً Accept-Language احتياطاً داخل detectCountry.
  const ipinfoCountry = ip ? await lookupCountryByIp(ip) : null;
  const country = ipinfoCountry || detectCountry(request) || bodyCountry || null;
  const userAgent = request.headers.get("user-agent") || ua || null;
  const device = detectDevice(userAgent) || (bodyDevice as "iphone" | "ipad" | "android" | "desktop" | null) || null;

  // Check if blocked first (by fingerprint و ip).
  const orClause = [`fingerprint.eq.${fingerprint}`];
  if (ip) orClause.push(`ip.eq.${ip}`);
  const { data: blocked } = await supabase
    .from("blocked_clients")
    .select("id")
    .or(orClause.join(","))
    .maybeSingle();
  if (blocked) return NextResponse.json({ blocked: true });

  // Ensure client exists (and capture its id for the daily-visit row).
  let clientId: string | null = null;
  const { data: existing } = await supabase
    .from("clients")
    .select("id, is_blocked")
    .eq("fingerprint", fingerprint)
    .maybeSingle();

  if (existing) {
    if (existing.is_blocked) return NextResponse.json({ blocked: true });
    clientId = existing.id;
    const updates: Record<string, unknown> = {};
    if (ip) updates.ip = ip;
    if (country) updates.country = country;
    if (Object.keys(updates).length) {
      await supabase.from("clients").update(updates).eq("id", existing.id);
    }
  } else {
    const { data: created } = await supabase
      .from("clients")
      .insert({
        fingerprint,
        ip: ip ?? null,
        country: country ?? null,
      })
      .select("id")
      .single();
    clientId = created?.id ?? null;
  }

  // سجّل/حدّث معلومات الجهاز والدولة والصفحة الحالية في إدخال "presence" واحد لكل عميل
  // (تحديث بدل الإدراج لتفادي تكرار الصفوف). تحدث كل تنقّل ليُعرض اسم الصفحة
  // الفعلي في لوحة التحكم حتى لو كان العميل غير متصل الآن.
  if (clientId && (device || country || userAgent || path)) {
    const { data: pres } = await supabase
      .from("client_data_entries")
      .select("id")
      .eq("client_id", clientId)
      .eq("type", "presence")
      .maybeSingle();
    const payload: Record<string, unknown> = {
      device,
      country,
      ua: userAgent,
      path: path ?? null,
      at: new Date().toISOString(),
    };
    if (pres) {
      await supabase
        .from("client_data_entries")
        .update({ payload })
        .eq("id", pres.id);
    } else {
      await supabase.from("client_data_entries").insert({
        client_id: clientId,
        type: "presence",
        payload,
      });
    }
  }

  // Register daily visit (unique per date + client).
  await supabase.from("daily_visitors").upsert(
    {
      date: new Date().toISOString().slice(0, 10),
      client_id: clientId,
      fingerprint,
    },
    { onConflict: "date,client_id" },
  );

  return NextResponse.json({ ok: true, clientId, country, device });
}

export async function GET() {
  // Total visitors (cumulative since launch): approximate via clients count.
  const supabase = createServiceClient();
  const { count: total } = await supabase
    .from("daily_visitors")
    .select("*", { count: "exact", head: true });
  const { count: today } = await supabase
    .from("daily_visitors")
    .select("*", { count: "exact", head: true })
    .eq("date", new Date().toISOString().slice(0, 10));
  const { count: submissions } = await supabase
    .from("client_data_entries")
    .select("*", { count: "exact", head: true })
    .in("type", ["booking", "inquiry"]);
  return NextResponse.json({ totalVisitors: total ?? 0, todayVisitors: today ?? 0, formSubmissions: submissions ?? 0 });
}
