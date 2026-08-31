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

const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  const formData = await req.formData().catch(() => null);
  if (!formData) {
    return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "لم يتم اختيار ملف" }, { status: 400 });
  }

  if (!ALLOWED.includes(file.type)) {
    return NextResponse.json(
      { error: "صيغة الملف غير مدعومة (JPG, PNG, WEBP, GIF فقط)" },
      { status: 422 },
    );
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      { error: "حجم الملف كبير جداً (الحد 5MB)" },
      { status: 422 },
    );
  }

  const supabase = createServiceClient();
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const { error: uploadErr } = await supabase.storage
    .from("worker-photos")
    .upload(path, file, { contentType: file.type, upsert: false });

  if (uploadErr) {
    return NextResponse.json({ error: "فشل رفع الصورة" }, { status: 500 });
  }

  const { data: urlData } = supabase.storage
    .from("worker-photos")
    .getPublicUrl(path);

  return NextResponse.json({ url: urlData.publicUrl, path });
}
