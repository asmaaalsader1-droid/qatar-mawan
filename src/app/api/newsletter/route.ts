import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { newsletterSchema } from "@/lib/validations";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });

  const parsed = newsletterSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 422 });
  }

  const supabase = createServiceClient();
  const { error } = await supabase.from("newsletter").insert({ email: parsed.data.email });
  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ ok: true, message: "مشترك مسبقاً" });
    }
    return NextResponse.json({ error: "فشل الاشتراك" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
