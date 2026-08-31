// شعارات شبكات البطاقات بصيغة SVG (خلفية شفافة) لعرضها واقعياً داخل البطاقة المصورة.
// نطابق اسم الشبكة القادم من BIN API (data.handyapi.com -> Scheme) بشكل غير حساس.

import styles from "./CardBrandLogo.module.css";

const SCHEME_ALIASES: Record<string, string> = {
  visa: "visa",
  mastercard: "mastercard",
  "master card": "mastercard",
  mc: "mastercard",
  amex: "amex",
  "american express": "amex",
  "americanexpress": "amex",
  discover: "discover",
  "discover card": "discover",
  maestro: "maestro",
  unionpay: "unionpay",
  "union pay": "unionpay",
  "union paycard": "unionpay",
  jcb: "jcb",
  diners: "diners",
  "diners club": "diners",
  elo: "elo",
  hipercard: "hipercard",
  troy: "troy",
  rupay: "rupay",
};

function normalize(scheme: string): string {
  return SCHEME_ALIASES[scheme.trim().toLowerCase()] ?? "";
}

export function CardBrandLogo({ scheme }: { scheme: string }) {
  const key = normalize(scheme);

  const logo = LOGOS[key];
  if (!logo) {
    return <span className={styles.fallback}>{scheme}</span>;
  }
  return (
    <span className={styles.wrap} aria-label={scheme} title={scheme}>
      {logo}
    </span>
  );
}

const LOGOS: Record<string, JSX.Element> = {
  visa: (
    <svg viewBox="0 0 48 16" width="48" height="16" role="img" aria-label="VISA">
      <path fill="#1A1F71" d="M3.6 15.6H.4L6.2.4h3.2zm9.2 0c-.3-3.2-1-6.5-1-9.2L9.8 7c-.6 1.4-1.5 2.8-2.5 4l-.4-3.4 3-7.2h3l-.3 6.4c0 2.4.4 4.6.4 6.8z" transform="scale(2)" />
      <path fill="#1A1F71" d="M20.4 4.8c0 1 .6 1.8 2 2.3 1 .4 1.2.6 1.2 1 0 .5-.6.8-1.6.8-.9 0-1.7-.1-2.6-.5l-.4 2.3c.7.3 1.5.4 2.8.4 3 0 4.4-1.2 4.4-3 0-1.2-.6-2-2-2.5-1-.4-1.2-.6-1.2-1 0-.4.4-.7 1.3-.7.7 0 1.7.1 2.4.3l.3-2.2c-.6-.1-1.5-.2-2.6-.2-3.2 0-4.3 1.4-4.3 3z" transform="scale(2) translate(2,0)" />
      <path fill="#1A1F71" d="M36 .4l-4.6 15.2h-3l.5-2.2c-.4-.6-.7-1.3-.9-2.1L23.6.4h3l1.7 8.8c.2 1 .4 1.8.4 2.6.4-1.2.8-2.3 1.3-3.4L32.6.4z" transform="scale(2)" />
    </svg>
  ),
  mastercard: (
    <svg viewBox="0 0 48 30" width="48" height="30" role="img" aria-label="Mastercard">
      <circle cx="18" cy="15" r="12" fill="#EB001B" />
      <circle cx="30" cy="15" r="12" fill="#F79E1B" />
      <path d="M24 6.5a12 12 0 000 17 12 12 0 000-17z" fill="#FF5F00" />
    </svg>
  ),
  amex: (
    <svg viewBox="0 0 48 30" width="48" height="30" role="img" aria-label="American Express">
      <rect width="48" height="30" rx="3" fill="#1F72CD" />
      <path fill="#fff" d="M11 10.5L8 18h2l.5-1.4h2.6L13.6 18h2.2L12.8 10.5zm1 2.2l.9 2.7h-1.8zM19.4 10.5v7.5h2.3v-2.4l.4-.5 1.7 2.9h2.8L24 14.4l2.5-3.9h-2.7l-2 3.2v-3.2zM31.4 10.5l-2.7 7.5h2.2l.5-1.4h2.6l.5 1.4h2.3l-2.7-7.5zm1 2.2l.9 2.7h-1.8z" />
    </svg>
  ),
  discover: (
    <svg viewBox="0 0 48 30" width="48" height="30" role="img" aria-label="Discover">
      <rect width="48" height="30" rx="3" fill="#fff" stroke="#e5e7eb" />
      <path fill="#F76C1E" d="M22 15a5 5 0 01-2.5 4.3A5 5 0 1122 15z" />
      <text x="24" y="19" fontFamily="Arial Black, sans-serif" fontSize="7" fill="#1a1a1a" fontWeight="900">DISCOVER</text>
    </svg>
  ),
  maestro: (
    <svg viewBox="0 0 48 30" width="48" height="30" role="img" aria-label="Maestro">
      <circle cx="18" cy="15" r="12" fill="#0099DF" opacity="0.9" />
      <circle cx="30" cy="15" r="12" fill="#ED0006" opacity="0.9" />
      <path d="M24 6.5a12 12 0 000 17 12 12 0 000-17z" fill="#6C6B6B" opacity="0.8" />
    </svg>
  ),
  unionpay: (
    <svg viewBox="0 0 48 30" width="48" height="30" role="img" aria-label="UnionPay">
      <rect width="16" height="30" x="0" fill="#E21836" />
      <rect width="16" height="30" x="16" fill="#00447C" />
      <rect width="16" height="30" x="32" fill="#007B5F" />
      <text x="24" y="19" textAnchor="middle" fontFamily="Arial" fontSize="6.5" fill="#fff" fontWeight="700">UnionPay</text>
    </svg>
  ),
  jcb: (
    <svg viewBox="0 0 48 30" width="48" height="30" role="img" aria-label="JCB">
      <rect width="48" height="30" rx="3" fill="#0E4C96" />
      <text x="24" y="20" textAnchor="middle" fontFamily="Arial Black" fontSize="11" fill="#fff" fontWeight="900" letterSpacing="1">JCB</text>
    </svg>
  ),
  diners: (
    <svg viewBox="0 0 48 30" width="48" height="30" role="img" aria-label="Diners Club">
      <rect width="48" height="30" rx="3" fill="#fff" stroke="#e5e7eb" />
      <circle cx="20" cy="15" r="9" fill="#004A98" />
      <path d="M20 8a7 7 0 000 14 5.5 5.5 0 010-14z" fill="#fff" />
      <text x="34" y="18" fontFamily="Arial" fontSize="6" fill="#004A98" fontWeight="700">DC</text>
    </svg>
  ),
  elo: (
    <svg viewBox="0 0 48 30" width="48" height="30" role="img" aria-label="Elo">
      <circle cx="16" cy="15" r="9" fill="#000" />
      <circle cx="16" cy="15" r="6" fill="#CB1D6C" />
      <text x="30" y="19" fontFamily="Arial Black" fontSize="8" fill="#231F20" fontWeight="900">elo</text>
    </svg>
  ),
  hipercard: (
    <svg viewBox="0 0 48 30" width="48" height="30" role="img" aria-label="Hipercard">
      <rect width="48" height="30" rx="3" fill="#8B1A1A" />
      <text x="24" y="19" textAnchor="middle" fontFamily="Arial Black" fontSize="5.5" fill="#fff" fontWeight="900">Hipercard</text>
    </svg>
  ),
  troy: (
    <svg viewBox="0 0 48 30" width="48" height="30" role="img" aria-label="Troy">
      <rect width="48" height="30" rx="3" fill="#0F8268" />
      <text x="24" y="19" textAnchor="middle" fontFamily="Arial Black" fontSize="9" fill="#fff" fontWeight="900">troy</text>
    </svg>
  ),
  rupay: (
    <svg viewBox="0 0 48 30" width="48" height="30" role="img" aria-label="RuPay">
      <text x="24" y="19" textAnchor="middle" fontFamily="Arial Black" fontSize="8" fill="#097D39" fontWeight="900">RuPay</text>
      <path d="M30 16l3 4h-3z" fill="#F37021" />
      <path d="M33 16l3 4h-3z" fill="#0F7B30" transform="rotate(180 34.5 18)" />
    </svg>
  ),
};
