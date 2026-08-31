import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") || "";
  const nationality = searchParams.get("nationality") || "";
  const language = searchParams.get("language") || "";
  const religion = searchParams.get("religion") || "";
  const availability = searchParams.get("availability") || "";
  const employment = searchParams.get("employment") || "";
  const employmentValues = employment
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const sort = searchParams.get("sort") || "recommended";
  const page = Math.max(1, Number(searchParams.get("page") || "1"));
  const pageSize = Number(searchParams.get("pageSize") || "12");

  const supabase = createClient();
  const workerListFields = "id, slug, full_name, nationality, experience_years, languages, religion, expected_salary, skills, photo_url, availability, employment_type, updated_at";
  let query = supabase.from("workers").select(workerListFields, { count: "exact" });

  if (q) query = query.or(`full_name.ilike.%${q}%,skills.cs.{${q}}`);
  if (nationality && nationality !== "all")
    query = query.eq("nationality", nationality);
  if (language && language !== "all")
    query = query.contains("languages", [language]);
  if (religion && religion !== "all") query = query.eq("religion", religion);
  if (availability && availability !== "all")
    query = query.eq("availability", availability);
  if (employmentValues.length > 0 && !employmentValues.includes("all"))
    query = query.overlaps("employment_type", employmentValues);

  if (sort === "salary_asc") query = query.order("expected_salary", { ascending: true });
  else if (sort === "salary_desc") query = query.order("expected_salary", { ascending: false });
  else if (sort === "experience") query = query.order("experience_years", { ascending: false });
  else if (sort === "name") query = query.order("full_name", { ascending: true });
  else query = query.order("created_at", { ascending: false });

  query = query.range((page - 1) * pageSize, page * pageSize - 1);

  const { data, error, count } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    items: data,
    total: count ?? 0,
    page,
    pageSize,
    totalPages: Math.ceil((count ?? 0) / pageSize),
  });
}
