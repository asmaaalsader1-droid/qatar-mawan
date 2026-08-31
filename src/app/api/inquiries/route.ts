import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { inquirySchema } from "@/lib/validations";
import { generateBookingRef } from "@/lib/utils";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });

  const parsed = inquirySchema.safeParse(body);
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0] as string;
      if (!errors[field]) errors[field] = issue.message;
    }
    return NextResponse.json({ errors }, { status: 422 });
  }

  const supabase = createServiceClient();
  const refNo = generateBookingRef();

  const { error } = await supabase.from("client_data_entries").insert({
    type: "inquiry",
    payload: { ...parsed.data, refNo },
  });

  if (error) {
    return NextResponse.json({ error: "فشل الحفظ" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, refNo });
}
