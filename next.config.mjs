/** @type {import('next').NextConfig} */

// سياسة أمان المحتوى (CSP): نسمح بتحميل الصور من أي مصدر https خارجي
// (شعارات البنوك من img.logo.dev، صور المرشحين من pravatar/unsplash، إلخ)
// مع تقييد باقي المصادر لئلا نكسر Next.js أو Supabase Realtime (wss).
// ملاحظة: script-src/warn 'unsafe-inline'/'unsafe-eval' ضرورية لعمل Next.js
// (injects inline scripts في dev وبعض production builds).
const CSP = [
  "default-src 'self'",
  "img-src 'self' data: blob: https:",
  "style-src 'self' 'unsafe-inline'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "connect-src 'self' https: wss:",
  "media-src 'self'",
  "font-src 'self' data:",
  "frame-ancestors 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const nextConfig = {
  reactStrictMode: true,
  // أسماء نطاقات المعاينة الخارجية للسماح بوصول Fast Refresh من خلالها في وضع التطوير.
  // (منافذ 12000/12001 موجّهة عبر prod-runtime.all-hands.dev)
  allowedDevOrigins: [
    "work-1-xkwoscmkfcpcmemq.prod-runtime.all-hands.dev",
    "work-2-xkwoscmkfcpcmemq.prod-runtime.all-hands.dev",
  ],
  images: {
    // أسماء النطاقات البعيدة للصور المسموح تحسينها عبر next/image.
    // الصور تُحمّل من خوادم روزانا الخارجية (+ شعارات البنوك وغيرها).
    remotePatterns: [
      { protocol: "https", hostname: "i.pravatar.cc" },
      { protocol: "https", hostname: "placehold.co" },
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "img.logo.dev" },
      // خوادم صور العاملات (روزانا + النطاقات الفرعية onesourceerp):
      { protocol: "https", hostname: "rozana-manpower.com" },
      { protocol: "https", hostname: "**.onesourceerp.com" },
      // شعار الموقع (مخزّن على خادم الأصول):
      { protocol: "https", hostname: "assets.khadmqtr.com" },
      { protocol: "https", hostname: "wxknpssoebirzguwcivf.supabase.co" },
    ],
    // إخراج WebP مع تخزين النسخ المحسّنة لمدة طويلة؛ تتغير الصورة عند تغيير updated_at.
    formats: ["image/webp"],
    minimumCacheTTL: 60 * 60 * 24 * 30,
    deviceSizes: [320, 480, 640, 750, 828, 1080, 1200],
    imageSizes: [64, 96, 128, 256, 384],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: CSP },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
