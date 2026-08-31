"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import type { Setting } from "@/lib/supabase/types";
import styles from "./SettingsAdminClient.module.css";

export function SettingsAdminClient({ settings }: { settings: Setting[] }) {
  const toast = useToast();
  const [modal, setModal] = useState(false);
  const [editKey, setEditKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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

    // Settings are keyed by `key`; upsert via the main settings route.
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
    } else {
      toast.push("فشل", "error");
    }
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

      <Card className={styles.tableCard}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>المفتاح</th>
              <th>القيمة</th>
              <th>إجراء</th>
            </tr>
          </thead>
          <tbody>
            {settings.map((s) => (
              <tr key={s.key}>
                <td className={styles.keyCell}>{s.key}</td>
                <td className={styles.valueCell}>{JSON.stringify(s.value)}</td>
                <td>
                  <div className={styles.actions}>
                    <button className={styles.editBtn} onClick={() => openEdit(s)}>تعديل</button>
                    <button className={styles.deleteBtn} onClick={() => deleteSetting(s)}>حذف</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Modal open={modal} onClose={() => { setModal(false); setEditKey(null); }} title={editKey ? "تعديل الإعداد" : "إعداد جديد"}>
        <form onSubmit={submit} className={styles.form}>
          <Field label="المفتاح">
            <Input name="key" required placeholder="admin_email" />
          </Field>
          <Field label="القيمة (JSON)">
            <Textarea name="value" rows={6} defaultValue="{}" />
          </Field>
          <Button type="submit" size="lg" disabled={loading}>
            {loading ? "جارٍ..." : editKey ? "حفظ" : "إضافة"}
          </Button>
        </form>
      </Modal>
    </div>
  );
}
