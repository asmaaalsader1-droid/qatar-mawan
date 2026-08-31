import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseServiceClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { SITE } from "@/config/site";

// تجاوز تخزين Next.js المؤقت للـ fetch حتى تُقرأ بيانات Supabase (الحظر/الجلسة)
// بشكل حيّ في كل طلب، وإلا فقد لا يُطبَّق الحظر فوراً.
const noStoreFetch: typeof fetch = (input, init) =>
  fetch(input, { ...init, cache: "no-store" } as RequestInit & { cache: string });

const LOCALES = SITE.locales;
const DEFAULT_LOCALE = SITE.defaultLocale;

function getLocaleFromPath(pathname: string): string | null {
  for (const locale of LOCALES) {
    if (pathname === `/${locale}` || pathname.startsWith(`/${locale}/`)) {
      return locale;
    }
  }
  return null;
}

/** البصمة تُخزَّن في كوكي من جهة العميل لنتمكن من فحصها في الـ middleware. */
const FP_COOKIE = "khdm-fp";

function getFingerprintCookie(request: NextRequest): string | null {
  const fp = request.cookies.get(FP_COOKIE)?.value;
  return fp || null;
}

/**
 * فحص الحظر عبر service-role client لتجاوز RLS على blocked_clients
 * (الجدول مقيّد بالأدمن فقط، لكن الـ middleware يحتاج لقراءته لكل زائر).
 * نستخدم service client لهذا الاستعلام المحدود فقط.
 */
async function isBlocked(
  ip: string | null,
  fingerprint: string | null,
): Promise<boolean> {
  if (!ip && !fingerprint) return false;
  const supabase = createSupabaseServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false }, global: { fetch: noStoreFetch } },
  );
  let query = supabase.from("blocked_clients").select("id").limit(1);
  if (ip && fingerprint) {
    query = query.or(`ip.eq.${ip},fingerprint.eq.${fingerprint}`);
  } else if (ip) {
    query = query.eq("ip", ip);
  } else if (fingerprint) {
    query = query.eq("fingerprint", fingerprint);
  }
  const { data } = await query.maybeSingle();
  return !!data;
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: { fetch: noStoreFetch },
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Refresh the user's session (important for server-side auth).
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    null;
  const fingerprint = getFingerprintCookie(request);

  // ضبط header اللغة ليقرأه root layout لتحديد <html lang dir>
  const detectedLocale = getLocaleFromPath(pathname) ?? DEFAULT_LOCALE;
  supabaseResponse.headers.set("x-locale", detectedLocale);

  // تحقق من أن المستخدم المسجّل أدمن (لتخطّي فحص الحظر عنه).
  let isAdmin = false;
  if (user) {
    const { data: setting } = await supabase
      .from("settings")
      .select("value")
      .eq("key", "admin_email")
      .maybeSingle();
    const adminEmail = (setting?.value as { email?: string })?.email;
    isAdmin = !!adminEmail && user.email === adminEmail;
  }

  // نظام الحظر: افحص blocked_clients بـ IP والبصمة معاً.
  // لا نطبّق الحظر على: مسارات API، مسارات الأدمن، أو المستخدم المسجّل كأدمن.
  if (
    !pathname.startsWith("/api/") &&
    !pathname.startsWith("/admin") &&
    !isAdmin
  ) {
    const blocked = await isBlocked(ip, fingerprint);
    if (blocked) {
      // اسمح لصفحة الحظر نفسها.
      const onBlockedPage = LOCALES.some(
        (l) => pathname === `/${l}/blocked` || pathname.startsWith(`/${l}/blocked`),
      );
      if (!onBlockedPage) {
        const url = request.nextUrl.clone();
        url.pathname = `/${DEFAULT_LOCALE}/blocked`;
        return NextResponse.redirect(url);
      }
    }
  }

  // i18n redirect: if root path with no locale, redirect to default locale.
  if (pathname === "/" ) {
    const url = request.nextUrl.clone();
    url.pathname = `/${DEFAULT_LOCALE}`;
    return NextResponse.redirect(url);
  }

  // مسارات معاون الرئيسية بدون بادئة لغة → أعد التوجيه إلى اللغة الافتراضية.
  const UNPREFIXED_ROUTES = ["/hourly", "/monthly", "/client-info", "/amount", "/contact"];
  if (UNPREFIXED_ROUTES.includes(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = `/${DEFAULT_LOCALE}${pathname}`;
    return NextResponse.redirect(url);
  }

  // Protect admin routes: require authenticated user.
  if (pathname.startsWith("/admin") && !pathname.includes("/admin/login")) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = `/${DEFAULT_LOCALE}/login`;
      url.searchParams.set("redirect", pathname);
      return NextResponse.redirect(url);
    }
    // Admin role check is enforced server-side in route handlers via settings.
  }

  // Protect client account routes.
  if (pathname.includes("/account") && !user) {
    const url = request.nextUrl.clone();
    url.pathname = `/${DEFAULT_LOCALE}/login`;
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export { LOCALES, DEFAULT_LOCALE, getLocaleFromPath };
