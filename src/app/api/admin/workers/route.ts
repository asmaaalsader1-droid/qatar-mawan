import { NextRequest, NextResponse } from "next/server";
import { createServiceClient, createClient } from "@/lib/supabase/server";
import { workerSchema } from "@/lib/validations";
import { slugify } from "@/lib/utils";

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
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "غير مصرح" }, { status: 403 });

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("workers")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "غير مصرح" }, { status: 403 });

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });

  const parsed = workerSchema.safeParse(body);
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0] as string;
      if (!errors[field]) errors[field] = issue.message;
    }
    return NextResponse.json({ errors }, { status: 422 });
  }

  const supabase = createServiceClient();
  const slug = slugify(parsed.data.full_name) + "-" + Math.random().toString(36).slice(2, 5);

  const { data, error } = await supabase
    .from("workers")
    .insert({
      slug,
      full_name: parsed.data.full_name,
      nationality: parsed.data.nationality,
      experience_years: parsed.data.experience_years,
      languages: parsed.data.languages,
      religion: parsed.data.religion ?? null,
      marital_status: parsed.data.marital_status ?? null,
      children_count: parsed.data.children_count,
      expected_salary: parsed.data.expected_salary,
      skills: parsed.data.skills,
      photo_url: parsed.data.photo_url || null,
      availability: parsed.data.availability,
      placement: parsed.data.placement ?? null,
      terms: parsed.data.terms ?? null,
      return_policy: parsed.data.return_policy ?? null,
      previous_countries: parsed.data.previous_countries,
      bio: parsed.data.bio ?? null,
      employment_type: parsed.data.employment_type,
    })
    .select("id, slug")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, id: data.id, slug: data.slug });
}
