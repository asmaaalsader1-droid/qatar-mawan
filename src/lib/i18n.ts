import ar from "@/messages/ar.json";
import en from "@/messages/en.json";

const dictionaries = { ar, en } as const;
export type Locale = keyof typeof dictionaries;
export type Dictionary = typeof ar;

export function getDictionary(locale: string): Dictionary {
  return (dictionaries[locale as Locale] || dictionaries.ar) as Dictionary;
}

export function t(dict: Dictionary, key: string, vars?: Record<string, string | number>): string {
  const parts = key.split(".");
  let value: unknown = dict;
  for (const part of parts) {
    if (value && typeof value === "object" && part in (value as Record<string, unknown>)) {
      value = (value as Record<string, unknown>)[part];
    } else {
      return key;
    }
  }
  if (typeof value === "string") {
    if (vars) {
      return value.replace(/\{\{(\w+)\}\}/g, (_, k) => String(vars[k] ?? ""));
    }
    return value;
  }
  return key;
}

export function dir(locale: string): "rtl" | "ltr" {
  return locale === "ar" ? "rtl" : "ltr";
}
