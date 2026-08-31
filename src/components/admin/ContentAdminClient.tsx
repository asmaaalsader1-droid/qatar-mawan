"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea, Select } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import type { PageContent } from "@/lib/supabase/types";
import styles from "./ContentAdminClient.module.css";

const PAGES = ["home", "about", "services", "contact", "terms", "privacy", "blog"];
const SECTIONS = ["hero", "intro", "body", "cta", "footer"];
const LOCALES = ["ar", "en"];

export function ContentAdminClient({ pages }: { pages: PageContent[] }) {
  const toast = useToast();
  const [modal, setModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const form = e.currentTarget;
    const data = new FormData(form);
    const page = String(data.get("page") ?? "");
    const section = String(data.get("section") ?? "");
    const locale = String(data.get("locale") ?? "ar");
    const html = String(data.get("html") ?? "");
    const text = String(data.get("text") ?? "") || null;

    const payload = {
      page,
      section,
      locale,
      content: { html, text },
    };

    const url = editId ? `/api/admin/content/${editId}` : "/api/admin/content";
    const method = editId ? "PATCH" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setLoading(false);
    if (!res.ok) {
      toast.push("فشل", "error");
      return;
    }
    toast.push(editId ? "تم التحديث" : "تمت الإضافة", "success");
    setModal(false);
    setEditId(null);
    window.location.reload();
  }

  async function deletePage(p: PageContent) {
    if (!confirm(`حذف محتوى ${p.page}/${p.section}/${p.locale}؟`)) return;
    const res = await fetch(`/api/admin/content/${p.id}`, { method: "DELETE" });
    if (res.ok) {
      toast.push("تم الحذف", "success");
      window.location.reload();
    } else {
      toast.push("فشل", "error");
    }
  }

  function openEdit(p: PageContent) {
    setEditId(p.id);
    setModal(true);
    setTimeout(() => {
      const form = document.querySelector("form") as HTMLFormElement | null;
      if (!form) return;
      (form.elements.namedItem("page") as HTMLSelectElement).value = p.page;
      (form.elements.namedItem("section") as HTMLSelectElement).value = p.section;
      (form.elements.namedItem("locale") as HTMLSelectElement).value = p.locale;
      (form.elements.namedItem("html") as HTMLTextAreaElement).value = (p.content as { html?: string })?.html ?? "";
      (form.elements.namedItem("text") as HTMLTextAreaElement).value = (p.content as { text?: string })?.text ?? "";
    }, 100);
  }

  return (
    <div>
      <div className={styles.header}>
        <h1 className={styles.title}>المحتوى ({pages.length})</h1>
        <Button onClick={() => { setEditId(null); setModal(true); }}>+ محتوى جديد</Button>
      </div>

      <Card className={styles.tableCard}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>الصفحة</th>
              <th>القسم</th>
              <th>اللغة</th>
              <th>الإجراء</th>
            </tr>
          </thead>
          <tbody>
            {pages.map((p) => (
              <tr key={p.id}>
                <td>{p.page}</td>
                <td>{p.section}</td>
                <td>{p.locale}</td>
                <td>
                  <div className={styles.actions}>
                    <button className={styles.editBtn} onClick={() => openEdit(p)}>تعديل</button>
                    <button className={styles.deleteBtn} onClick={() => deletePage(p)}>حذف</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Modal open={modal} onClose={() => { setModal(false); setEditId(null); }} title={editId ? "تعديل المحتوى" : "محتوى جديد"} size="lg">
        <form onSubmit={submit} className={styles.form}>
          <div className={styles.row}>
            <Field label="الصفحة">
              <Select name="page" defaultValue="home">
                {PAGES.map((p) => <option key={p} value={p}>{p}</option>)}
              </Select>
            </Field>
            <Field label="القسم">
              <Select name="section" defaultValue="body">
                {SECTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
              </Select>
            </Field>
            <Field label="اللغة">
              <Select name="locale" defaultValue="ar">
                {LOCALES.map((l) => <option key={l} value={l}>{l}</option>)}
              </Select>
            </Field>
          </div>
          <Field label="نص بديل (plain)">
            <Textarea name="text" rows={3} />
          </Field>
          <Field label="HTML">
            <Textarea name="html" rows={10} />
          </Field>
          <Button type="submit" size="lg" disabled={loading}>
            {loading ? "جارٍ..." : editId ? "حفظ" : "إضافة"}
          </Button>
        </form>
      </Modal>
    </div>
  );
}
