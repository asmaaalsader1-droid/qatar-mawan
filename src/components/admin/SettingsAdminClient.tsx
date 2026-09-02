"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import type { Setting } from "@/lib/supabase/types";
import styles from "./SettingsAdminClient.module.css";

type GeoSetting = {
  enabled?: boolean;
  mode?: "allowlist" | "blocklist";
  countries?: string[];
};

const COUNTRIES = [
  ["QA", "قطر"], ["SA", "السعودية"], ["AE", "الإمارات"], ["KW", "الكويت"],
  ["BH", "البحرين"], ["OM", "عُمان"], ["EG", "مصر"], ["JO", "الأردن"],
  ["LB", "لبنان"], ["PS", "فلسطين"], ["SY", "سوريا"], ["IQ", "العراق"],
  ["YE", "اليمن"], ["IN", "الهند"], ["PK", "باكستان"], ["BD", "بنغلاديش"],
  ["LK", "سريلانكا"], ["NP", "نيبال"], ["PH", "الفلبين"], ["ID", "إندونيسيا"],
  ["ET", "إثيوبيا"], ["UG", "أوغندا"], ["KE", "كينيا"], ["SD", "السودان"],
  ["NG", "نيجيريا"], ["ZA", "جنوب أفريقيا"], ["MA", "المغرب"], ["DZ", "الجزائر"],
  ["TN", "تونس"], ["TR", "تركيا"], ["GB", "المملكة المتحدة"], ["US", "الولايات المتحدة"],
  ["CA", "كندا"], ["AU", "أستراليا"], ["DE", "ألمانيا"], ["FR", "فرنسا"],
  ["IT", "إيطاليا"], ["ES", "إسبانيا"], ["JP", "اليابان"], ["CN", "الصين"],
  ["KR", "كوريا الجنوبية"], ["RU", "روسيا"],
] as const;

const GEO_KEY = "geo_blocking";

export function SettingsAdminClient({ settings }: { settings: Setting[] }) {
  const toast = useToast();
  const [modal, setModal] = useState(false);
  const [editKey, setEditKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const geoSetting = settings.find((setting) => setting.key === GEO_KEY);
  const rawGeo = (geoSetting?.value ?? {}) as GeoSetting;
  const [geoEnabled, setGeoEnabled] = useState(Boolean(rawGeo.enabled));
  const [blockedCountries, setBlockedCountries] = useState<string[]>(
    Array.isArray(rawGeo.countries) ? rawGeo.countries : [],
  );
  const [selectedCountry, setSelectedCountry] = useState("");

  const blockedRows = useMemo(
    () => blockedCountries.map((code) => COUNTRIES.find(([countryCode]) => countryCode === code) ?? [code, code]),
    [blockedCountries],
  );
  const availableCountries = COUNTRIES.filter(([code]) => !blockedCountries.includes(code));

  async function saveGeoSetting(nextCountries = blockedCountries, nextEnabled = geoEnabled) {
    setGeoLoading(true);
    const res = await fetch("/api/admin/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        key: GEO_KEY,
        value: { enabled: nextEnabled, mode: "blocklist", countries: nextCountries },
      }),
    });
    setGeoLoading(false);
    if (!res.ok) {
      toast.push("تعذر حفظ إعدادات الحظر الجغرافي", "error");
      return false;
    }
    toast.push("تم حفظ إعدادات الحظر الجغرافي", "success");
    return true;
  }

  async function blockSelectedCountry() {
    if (!selectedCountry || blockedCountries.includes(selectedCountry)) return;
    const nextCountries = [...blockedCountries, selectedCountry];
    if (await saveGeoSetting(nextCountries, geoEnabled)) {
      setBlockedCountries(nextCountries);
      setSelectedCountry("");
    }
  }

  async function unblockCountry(code: string) {
    const nextCountries = blockedCountries.filter((country) => country !== code);
    if (await saveGeoSetting(nextCountries, geoEnabled)) setBlockedCountries(nextCountries);
  }

  async function toggleGeoBlocking() {
    const nextEnabled = !geoEnabled;
    if (await saveGeoSetting(blockedCountries, nextEnabled)) setGeoEnabled(nextEnabled);
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const form = e.currentTarget;
    const data = new FormData(form);
    const key = String(data.get("key") ?? "");
    const jsonText = String(data.get("value") ?? "{}");
    let value: unknown;
    try {
      value = JSON.parse(jsonText);
    } catch {
      toast.push("قيمة JSON غير صالحة", "error");
      setLoading(false);
      return;
    }
    const res = await fetch("/api/admin/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, value }),
    });
    setLoading(false);
    if (!res.ok) {
      toast.push("فشل", "error");
      return;
    }
    toast.push(editKey ? "تم التحديث" : "تمت الإضافة", "success");
    setModal(false);
    setEditKey(null);
    window.location.reload();
  }

  async function deleteSetting(s: Setting) {
    if (!confirm(`حذف الإعداد "${s.key}"؟`)) return;
    const res = await fetch(`/api/admin/settings/${encodeURIComponent(s.key)}`, { method: "DELETE" });
    if (res.ok) {
      toast.push("تم الحذف", "success");
      window.location.reload();
    } else toast.push("فشل", "error");
  }

  function openEdit(s: Setting) {
    setEditKey(s.key);
    setModal(true);
    setTimeout(() => {
      const form = document.querySelector("form") as HTMLFormElement | null;
      if (!form) return;
      (form.elements.namedItem("key") as HTMLInputElement).value = s.key;
      (form.elements.namedItem("value") as HTMLTextAreaElement).value = JSON.stringify(s.value, null, 2);
    }, 100);
  }

  return (
    <div>
      <div className={styles.header}>
        <h1 className={styles.title}>الإعدادات ({settings.length})</h1>
        <Button onClick={() => { setEditKey(null); setModal(true); }}>+ إعداد جديد</Button>
      </div>

      <Card className={styles.geoCard}>
        <div className={styles.geoHeader}>
          <div>
            <h2 className={styles.geoTitle}>الحظر الجغرافي</h2>
            <p className={styles.geoHint}>اختر الدولة من القائمة لحظرها، أو ارفع الحظر عنها من القائمة الحالية.</p>
          </div>
          <button
            type="button"
            className={`${styles.statusToggle} ${geoEnabled ? styles.statusOn : styles.statusOff}`}
            onClick={toggleGeoBlocking}
            disabled={geoLoading}
          >
            {geoEnabled ? "الحظر مفعّل" : "الحظر متوقف"}
          </button>
        </div>

        <div className={styles.geoControls}>
          <Field label="اختر الدولة المراد حظرها" htmlFor="geo-country">
            <Select
              id="geo-country"
              value={selectedCountry}
              onChange={(event) => setSelectedCountry(event.target.value)}
              disabled={geoLoading || availableCountries.length === 0}
            >
              <option value="">-- اختر دولة --</option>
              {availableCountries.map(([code, name]) => <option key={code} value={code}>{name} ({code})</option>)}
            </Select>
          </Field>
          <Button type="button" onClick={blockSelectedCountry} disabled={!selectedCountry || geoLoading}>
            {geoLoading ? "جارٍ الحفظ..." : "حظر الدولة"}
          </Button>
        </div>

        <div className={styles.blockedList}>
          <div className={styles.blockedListTitle}>الدول المحظورة ({blockedRows.length})</div>
          {blockedRows.length === 0 ? (
            <p className={styles.emptyGeo}>لا توجد دول محظورة حاليًا.</p>
          ) : (
            <div className={styles.countryChips}>
              {blockedRows.map(([code, name]) => (
                <div className={styles.countryChip} key={code}>
                  <span>{name} ({code})</span>
                  <button type="button" onClick={() => unblockCountry(code)} disabled={geoLoading} aria-label={`رفع الحظر عن ${name}`}>رفع الحظر</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      <Card className={styles.tableCard}>
        <table className={styles.table}>
          <thead><tr><th>المفتاح</th><th>القيمة</th><th>إجراء</th></tr></thead>
          <tbody>
            {settings.map((s) => (
              <tr key={s.key}>
                <td className={styles.keyCell}>{s.key}</td>
                <td className={styles.valueCell}>{JSON.stringify(s.value)}</td>
                <td><div className={styles.actions}>
                  <button className={styles.editBtn} onClick={() => openEdit(s)}>تعديل</button>
                  <button className={styles.deleteBtn} onClick={() => deleteSetting(s)}>حذف</button>
                </div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Modal open={modal} onClose={() => { setModal(false); setEditKey(null); }} title={editKey ? "تعديل الإعداد" : "إعداد جديد"}>
        <form onSubmit={submit} className={styles.form}>
          <Field label="المفتاح"><Input name="key" required placeholder="admin_email" /></Field>
          <Field label="القيمة (JSON)"><Textarea name="value" rows={6} defaultValue="{}" /></Field>
          <Button type="submit" size="lg" disabled={loading}>{loading ? "جارٍ..." : editKey ? "حفظ" : "إضافة"}</Button>
        </form>
      </Modal>
    </div>
  );
}
