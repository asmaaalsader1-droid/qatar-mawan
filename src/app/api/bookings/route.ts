import { NextRequest, NextResponse } from "next/server";
import { createServiceClient, broadcastNewEntry } from "@/lib/supabase/server";
import { createClient } from "@/lib/supabase/server";
import { bookingSchema } from "@/lib/validations";
import { generateBookingRef } from "@/lib/utils";
import { autoUnarchiveOnActivity } from "@/lib/archive";
import { defaultTerms, defaultReturnPolicy } from "@/lib/worker-terms";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });

  const parsed = bookingSchema.safeParse(body);
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0] as string;
      if (!errors[field]) errors[field] = issue.message;
    }
    return NextResponse.json({ errors }, { status: 422 });
  }

  const service = createServiceClient();

  // Fetch the worker to snapshot terms and return policy.
  const { data: worker } = await service
    .from("workers")
    .select("id, terms, return_policy, employment_type")
    .eq("id", parsed.data.candidateId)
    .maybeSingle();

  if (!worker) {
    return NextResponse.json({ error: "العاملة غير موجودة" }, { status: 404 });
  }

  // Ensure a client row exists (by fingerprint from header if available).
  const fingerprint = request.headers.get("x-fingerprint") || null;

  // Try to find or create a client entry.
  let clientId: string | null = null;
  if (fingerprint) {
    const { data: existing } = await service
      .from("clients")
      .select("id")
      .eq("fingerprint", fingerprint)
      .maybeSingle();
    if (existing) {
      clientId = existing.id;
      // حدّث بيانات العميل بأحدث قيم من النموذج.
      await service
        .from("clients")
        .update({ name: parsed.data.full_name, phone: parsed.data.phone })
        .eq("id", existing.id);
    } else {
      const { data: created } = await service
        .from("clients")
        .insert({
          fingerprint,
          name: parsed.data.full_name,
          phone: parsed.data.phone,
        })
        .select("id")
        .single();
      clientId = created?.id ?? null;
    }
  }

  const bookingRef = generateBookingRef();

  const { data: booking, error } = await service
    .from("bookings")
    .insert({
      booking_ref: bookingRef,
      client_id: clientId,
      worker_id: worker.id,
      status: "pending",
      notes: null,
      terms_snapshot: worker.terms ?? defaultTerms(worker, "ar"),
      return_policy_snapshot: worker.return_policy ?? defaultReturnPolicy(worker, "ar"),
    })
    .select("id, booking_ref")
    .single();

  if (error) {
    return NextResponse.json({ error: "فشل إنشاء الحجز" }, { status: 500 });
  }

  // Also record this as a data entry for the admin client tracker.
  const { data: entryRow } = await service
    .from("client_data_entries")
    .insert({
      client_id: clientId,
      type: "booking",
      payload: {
        ...parsed.data,
        bookingRef,
        bookingId: booking.id,
      },
    })
    .select("id")
    .single();

  // ألغِ أرشفة العميل تلقائياً لأنه عاد وأدخل بيانات جديدة.
  await autoUnarchiveOnActivity(clientId);

  // أبلغ لوحة الإدارة بوجود حجز جديد لتحديث الشريط الجانبي لحظياً.
  void broadcastNewEntry({
    clientId: clientId ?? fingerprint ?? null,
    entryId: entryRow?.id ?? booking.id,
    type: "booking",
  });

  return NextResponse.json({ ok: true, bookingRef, bookingId: booking.id });
}

export async function GET() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("bookings")
    .select("id, booking_ref, status, created_at, worker_id")
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
