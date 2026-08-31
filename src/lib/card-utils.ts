// أدوات التحقق من بطاقات الدفع: خوارزمية Luhn + استعلام BIN + شعارات البنوك

// خوارزمية لون للتحقق من صحة رقم البطاقة (تفادي الأخطاء الإملائية)
export function luhnCheck(cardNumber: string): boolean {
  const digits = cardNumber.replace(/\D/g, "");
  if (digits.length < 13 || digits.length > 19) return false;
  let sum = 0;
  let shouldDouble = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = parseInt(digits[i], 10);
    if (shouldDouble) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    shouldDouble = !shouldDouble;
  }
  return sum % 10 === 0;
}

export type BinInfo = {
  scheme: string | null;
  type: string | null;
  bank: string | null;
  country: string | null;
  countryCode: string | null;
  luhn: boolean;
  // نطاق البنك المُستخرج من اسمه (لجلب الشعار من Logo.dev) — قد يكون null للبنوك غير المعروفة.
  bankDomain: string | null;
  // رابط شعار البنك الشفاف من Logo.dev — null إذا لم يتوفّر نطاق أو مفتاح.
  logoUrl: string | null;
};

// قائمة بنوك الخليج والعالم الرئيسية: نص مطابقة (lowercase) → نطاق البنك.
// تُستخدم لربط اسم البنك القادم من BIN API بنطاقه لجلب شعاره من Logo.dev.
// ملاحظة: HandyAPI يُرجع اسم البنك أحياناً بالعربية وأحياناً بالإنجليزية،
// لذا نُضمّن المرادفين. الترتيب مهم: الأطول/الأكثر تحديداً أولاً لتفادي التضارب.
const BANK_DOMAINS: { match: string; domain: string }[] = [
  // --- قطر ---
  { match: "بنك قطر الوطني", domain: "qnb.com" },
  { match: "قطر الوطني", domain: "qnb.com" },
  { match: "qatar national", domain: "qnb.com" },
  { match: "qnb", domain: "qnb.com" },
  { match: "بنك الدوحة", domain: "dohabank.com" },
  { match: "doha bank", domain: "dohabank.com" },
  { match: "البنك التجاري القطري", domain: "cbk.com" },
  { match: "التجاري القطري", domain: "cbk.com" },
  { match: "commercial bank of qatar", domain: "cbk.com" },
  { match: "cbk qatar", domain: "cbk.com" },
  { match: "البنك الأهلي القطري", domain: "ahlibank.com.qa" },
  { match: "الأهلي القطري", domain: "ahlibank.com.qa" },
  { match: "ahli bank", domain: "ahlibank.com.qa" },
  { match: "al ahli bank", domain: "ahlibank.com.qa" },
  { match: "البنك الدولي القطري", domain: "ibq.com.qa" },
  { match: "الدولي القطري", domain: "ibq.com.qa" },
  { match: "international bank of qatar", domain: "ibq.com.qa" },
  { match: "ibq", domain: "ibq.com.qa" },
  { match: "مصرف الريان", domain: "alrayan.com" },
  { match: "masraf al rayan", domain: "alrayan.com" },
  { match: "al rayan", domain: "alrayan.com" },
  { match: "بنك قطر الإسلامي", domain: "qib.com.qa" },
  { match: "قطر الإسلامي", domain: "qib.com.qa" },
  { match: "qatar islamic bank", domain: "qib.com.qa" },
  { match: "بنك قطر الدولي الإسلامي", domain: "qiib.com.qa" },
  { match: "qatar international islamic", domain: "qiib.com.qa" },
  { match: "بنك البركة", domain: "barwabank.com" },
  { match: "barwa bank", domain: "barwabank.com" },
  { match: "بنك الخليجي", domain: "alkhaliji.com" },
  { match: "al khaliji", domain: "alkhaliji.com" },
  { match: "بنك دخان", domain: "dukhanbank.com" },
  { match: "dukhan bank", domain: "dukhanbank.com" },
  // --- السعودية ---
  { match: "مصرف الراجحي", domain: "alrajhibank.com.sa" },
  { match: "الراجحي", domain: "alrajhibank.com.sa" },
  { match: "al rajhi", domain: "alrajhibank.com.sa" },
  { match: "rajhi", domain: "alrajhibank.com.sa" },
  { match: "البنك الأهلي السعودي", domain: "alahli.com" },
  { match: "الأهلي السعودي", domain: "alahli.com" },
  { match: "national commercial bank", domain: "alahli.com" },
  { match: "ncb", domain: "alahli.com" },
  { match: "saudi national bank", domain: "alahli.com" },
  { match: "snb", domain: "alahli.com" },
  { match: "بنك الرياض", domain: "riyadbank.com" },
  { match: "riyad bank", domain: "riyadbank.com" },
  { match: "بنك البلاد", domain: "albilad.com" },
  { match: "bank albilad", domain: "albilad.com" },
  { match: "albilad", domain: "albilad.com" },
  { match: "مصرف الإنماء", domain: "alinma.com" },
  { match: "الإنماء", domain: "alinma.com" },
  { match: "alinma", domain: "alinma.com" },
  { match: "بنك الجزيرة", domain: "baj.com.sa" },
  { match: "bank aljazira", domain: "baj.com.sa" },
  { match: "aljazira", domain: "baj.com.sa" },
  { match: "البنك السعودي الفرنسي", domain: "alfransi.com.sa" },
  { match: "سعودي فرانسي", domain: "alfransi.com.sa" },
  { match: "banque saudi fransi", domain: "alfransi.com.sa" },
  { match: "saudi fransi", domain: "alfransi.com.sa" },
  { match: "بنك ساب", domain: "sabb.com" },
  { match: "samba", domain: "samba.com.sa" },
  { match: "sabb", domain: "sabb.com" },
  { match: "البنك السعودي البريطاني", domain: "sabb.com" },
  { match: "saudi british bank", domain: "sabb.com" },
  { match: "البنك السعودي الهولندي", domain: "alawwalbank.com" },
  { match: "saudi hollandi", domain: "alawwalbank.com" },
  { match: "alawwal", domain: "alawwalbank.com" },
  { match: "البنك العربي الوطني", domain: "anb.com.sa" },
  { match: "arab national bank", domain: "anb.com.sa" },
  // --- الإمارات ---
  { match: "بنك الإمارات دبي الوطني", domain: "emiratesnbd.com" },
  { match: "الإمارات دبي الوطني", domain: "emiratesnbd.com" },
  { match: "إمارات إن بي دي", domain: "emiratesnbd.com" },
  { match: "emirates nbd", domain: "emiratesnbd.com" },
  { match: "بنك أبوظبي الأول", domain: "bankfab.com" },
  { match: "first abu dhabi", domain: "bankfab.com" },
  { match: "fab bank", domain: "bankfab.com" },
  { match: "بنك أبوظبي التجاري", domain: "adcb.com" },
  { match: "أبوظبي التجاري", domain: "adcb.com" },
  { match: "abu dhabi commercial", domain: "adcb.com" },
  { match: "adcb", domain: "adcb.com" },
  { match: "مصرف المشرق", domain: "mashreq.com" },
  { match: "بنك المشرق", domain: "mashreq.com" },
  { match: "mashreq", domain: "mashreq.com" },
  { match: "بنك دبي الإسلامي", domain: "dib.ae" },
  { match: "dubai islamic", domain: "dib.ae" },
  { match: "بنك أبوظبي الإسلامي", domain: "adib.ae" },
  { match: "أبوظبي الإسلامي", domain: "adib.ae" },
  { match: "abu dhabi islamic", domain: "adib.ae" },
  { match: "adib", domain: "adib.ae" },
  { match: "البنك التجاري في دبي", domain: "cbd.ae" },
  { match: "commercial bank of dubai", domain: "cbd.ae" },
  { match: "cbd bank", domain: "cbd.ae" },
  { match: "بنك رأس الخيمة الوطني", domain: "rakbank.ae" },
  { match: "rakbank", domain: "rakbank.ae" },
  { match: "national bank of ras al", domain: "rakbank.ae" },
  // --- الكويت ---
  { match: "بنك الكويت الوطني", domain: "nbk.com" },
  { match: "national bank of kuwait", domain: "nbk.com" },
  { match: "nbk", domain: "nbk.com" },
  { match: "بيت التمويل الكويتي", domain: "kfh.com" },
  { match: "kuwait finance house", domain: "kfh.com" },
  { match: "kfh", domain: "kfh.com" },
  { match: "بنك الكويت التجاري", domain: "cbk.com" },
  { match: "commercial bank of kuwait", domain: "cbk.com" },
  { match: "بنك برقان", domain: "burgan.com" },
  { match: "burgan bank", domain: "burgan.com" },
  { match: "بنك الخليج", domain: "gulfbank.com.kw" },
  { match: "gulf bank", domain: "gulfbank.com.kw" },
  { match: "بنك بوبيان", domain: "boubyanbank.com" },
  { match: "boubyan", domain: "boubyanbank.com" },
  { match: "بنك وربة", domain: "warbabank.com" },
  { match: "warba bank", domain: "warbabank.com" },
  { match: "البنك الأهلي المتحد", domain: "ahliunited.com.bh" },
  { match: "ahli bank of kuwait", domain: "abkuwait.com" },
  { match: "al ahli bank of kuwait", domain: "abkuwait.com" },
  // --- البحرين ---
  { match: "بنك البحرين الوطني", domain: "nbb.com.bh" },
  { match: "national bank of bahrain", domain: "nbb.com.bh" },
  { match: "ahli united bank", domain: "ahliunited.com.bh" },
  { match: "بنك البحرين والكويت", domain: "bbk.com.bh" },
  { match: "bbk", domain: "bbk.com.bh" },
  // --- عمان ---
  { match: "بنك مسقط", domain: "bankmuscat.com" },
  { match: "bank muscat", domain: "bankmuscat.com" },
  { match: "البنك الوطني العماني", domain: "nbo.om" },
  { match: "national bank of oman", domain: "nbo.om" },
  { match: "بنك عمان العربي", domain: "oaboman.com" },
  { match: "oman arab bank", domain: "oaboman.com" },
  { match: "بنك ظفار", domain: "bankdhofar.com" },
  { match: "dhofar bank", domain: "bankdhofar.com" },
  { match: "rafidain", domain: "rafidain-bank.org" },
  // --- دول أخرى رئيسية ---
  { match: "hsbc", domain: "hsbc.com" },
  { match: "standard chartered", domain: "sc.com" },
  { match: "citibank", domain: "citi.com" },
  { match: "citi bank", domain: "citi.com" },
  { match: "barclays", domain: "barclays.com" },
  { match: "deutsche bank", domain: "db.com" },
  { match: "jpmorgan", domain: "jpmorganchase.com" },
  { match: "chase bank", domain: "chase.com" },
];

// يربط اسم البنك القادم من BIN API بنطاقه لجلب شعاره من Logo.dev.
// pure function — تعمل في الخادم والواجهة.
export function resolveBankDomain(bankName: string | null): string | null {
  if (!bankName) return null;
  const lower = bankName.toLowerCase();
  for (const b of BANK_DOMAINS) {
    if (lower.includes(b.match)) return b.domain;
  }
  return null;
}

const LOGO_DEV_KEY = process.env.NEXT_PUBLIC_LOGO_DEV_KEY ?? "";

// يبني رابط شعار البنك الشفاف من Logo.dev بناءً على نطاق البنك.
// نستخدم الشعار الأصلي الملوّن (بدون theme=dark) ليعرض بألوانه الحقيقية،
// ويعاد تركيبه على صندوق أبيض في الواجهة ليكون واضحاً دائماً.
// يعيد null إذا لم يتوفّر النطاق أو المفتاح. pure function — تعمل في الخادم والواجهة.
export function getBankLogoUrl(domain: string | null): string | null {
  if (!domain || !LOGO_DEV_KEY) return null;
  return `https://img.logo.dev/${domain}?token=${LOGO_DEV_KEY}&format=png&retina=true`;
}

// كلمات عامة نُزيلها من اسم البنك قبل أخذ أول كلمتين (مقطعين) لتقصير الاسم الطويل.
// مثال: "AL RAJHI BANKING AND INVESTMENT CORP." → "AL RAJHI".
const BANK_STOP_WORDS = new Set([
  "bank", "banking", "corp", "corporation", "limited", "ltd", "inc",
  "the", "of", "and", "investment", "group", "holding", "company", "co",
  "بنك", "محدودة", "شركة", "للتمويل", "للإستثمار",
]);

// يختصر اسم البنك إلى أول كلمتين جوهريتين (مقطعين) أو كلمة واحدة،
// مع إزالة الكلمات العامة (BANK, CORP, محدودة ...). pure function.
export function shortenBankName(bank: string | null): string {
  if (!bank) return "";
  const words = bank
    .trim()
    .split(/\s+/)
    .map((w) => w.replace(/[.,;:]/g, ""))
    .filter((w) => w.length > 0 && !BANK_STOP_WORDS.has(w.toLowerCase()));
  if (words.length === 0) {
    // الاسم كله كلمات عامة (نادر) → أعد أول كلمة من الاسم الأصلي
    return bank.trim().split(/\s+/)[0] ?? bank;
  }
  return words.slice(0, 2).join(" ");
}

// يُشفّر رقم الهاتف لإظهار آخر 4 أرقام فقط (مثل •••••• 5451).
// يدخل «+» الدولي والرقم النهائي؛ الأرقام السابقة تُستبدل بنقاط. pure function.
export function maskPhone(phone: string | null): string {
  if (!phone) return "";
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 4) return "••••";
  const last4 = digits.slice(-4);
  const prefix = phone.startsWith("+") ? "+" : "";
  return `${prefix}•••••• ${last4}`;
}

// استعلام BIN مجاني عبر data.handyapi.com (بدون مفتاح)
export async function lookupBin(first6: string): Promise<BinInfo> {
  const empty: BinInfo = {
    scheme: null,
    type: null,
    bank: null,
    country: null,
    countryCode: null,
    luhn: false,
    bankDomain: null,
    logoUrl: null,
  };
  try {
    const res = await fetch(`https://data.handyapi.com/bin/${first6}`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      return empty;
    }
    const data = await res.json();
    const bank = data?.Issuer ?? null;
    const bankDomain = resolveBankDomain(bank);
    return {
      scheme: data?.Scheme ?? null,
      type: data?.Type ?? null,
      bank,
      country: data?.Country?.Name ?? null,
      countryCode: data?.Country?.A2 ?? null,
      luhn: data?.Luhn ?? false,
      bankDomain,
      logoUrl: getBankLogoUrl(bankDomain),
    };
  } catch {
    return empty;
  }
}
