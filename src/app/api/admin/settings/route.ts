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

export async function GET() {
  const supabase = createClient();
  const { data, error } = await supabase.from("settings").select("*");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const map: Record<string, unknown> = {};
  data.forEach((row) => {
    map[row.key] = row.value;
  });
  return NextResponse.json(map);
}

export async function PUT(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "غير مصرح" }, { status: 403 });

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });

  const { key, value } = body as { key: string; value: Record<string, unknown> };
  if (!key) return NextResponse.json({ error: "key مطلوب" }, { status: 422 });

  const supabase = createServiceClient();
  const { error } = await supabase.from("settings").upsert(
    {
      key,
      value,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "key" },
  );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function POST(request: NextRequest) {
  // Alias to PUT: upsert by key.
  return PUT(request);
}
