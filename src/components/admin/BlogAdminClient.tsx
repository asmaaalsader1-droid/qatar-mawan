"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea, Select } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import type { Article } from "@/lib/supabase/types";
import styles from "./BlogAdminClient.module.css";

const EMPTY = {
  title: "",
  slug: "",
  summary: "",
  cover_image_url: "",
  content_html: "",
  category: "",
  status: "draft" as const,
  locale: "ar" as const,
};

export function BlogAdminClient({ articles }: { articles: Article[] }) {
  const toast = useToast();
  const [modal, setModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const form = e.currentTarget;
    const data = new FormData(form);
    const payload = {
      title: String(data.get("title") ?? ""),
      slug: String(data.get("slug") ?? ""),
      summary: String(data.get("summary") ?? "") || null,
      cover_image_url: String(data.get("cover_image_url") ?? "") || null,
      content_html: String(data.get("content_html") ?? ""),
      category: String(data.get("category") ?? "") || null,
      status: String(data.get("status") ?? "draft"),
      locale: String(data.get("locale") ?? "ar"),
      published_at: String(data.get("status") ?? "") === "published" ? new Date().toISOString() : null,
    };

    const url = editId ? `/api/admin/articles/${editId}` : "/api/admin/articles";
    const method = editId ? "PATCH" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = await res.json();
    setLoading(false);
    if (!res.ok) {
      if (result.errors) {
        toast.push(Object.values(result.errors).join("، "), "error");
      } else {
        toast.push(result.error || "فشل", "error");
      }
      return;
    }
    toast.push(editId ? "تم التحديث" : "تم النشر", "success");
    setModal(false);
    setEditId(null);
    window.location.reload();
  }

  async function deleteArticle(a: Article) {
    if (!confirm(`حذف المقال "${a.title}"؟`)) return;
    const res = await fetch(`/api/admin/articles/${a.id}`, { method: "DELETE" });
    if (res.ok) {
      toast.push("تم الحذف", "success");
      window.location.reload();
    } else {
      toast.push("فشل", "error");
    }
  }

  function openEdit(a: Article) {
    setEditId(a.id);
    setModal(true);
    // Pre-fill form via default values on next render.
    setTimeout(() => {
      const form = document.querySelector("form") as HTMLFormElement | null;
      if (!form) return;
      (form.elements.namedItem("title") as HTMLInputElement).value = a.title;
      (form.elements.namedItem("slug") as HTMLInputElement).value = a.slug;
      (form.elements.namedItem("summary") as HTMLTextAreaElement).value = a.summary ?? "";
      (form.elements.namedItem("cover_image_url") as HTMLInputElement).value = a.cover_image_url ?? "";
      (form.elements.namedItem("content_html") as HTMLTextAreaElement).value = a.content_html ?? "";
      (form.elements.namedItem("category") as HTMLInputElement).value = a.category ?? "";
      (form.elements.namedItem("status") as HTMLSelectElement).value = a.status;
      (form.elements.namedItem("locale") as HTMLSelectElement).value = a.locale;
    }, 100);
  }

  return (
    <div>
      <div className={styles.header}>
        <h1 className={styles.title}>المدونة ({articles.length})</h1>
        <Button
          onClick={() => {
            setEditId(null);
            setModal(true);
          }}
        >
          + مقال جديد
        </Button>
      </div>

      <Card className={styles.tableCard}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>العنوان</th>
              <th>التصنيف</th>
              <th>اللغة</th>
              <th>الحالة</th>
              <th>التاريخ</th>
              <th>إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {articles.map((a) => (
              <tr key={a.id}>
                <td>{a.title}</td>
                <td>{a.category || "—"}</td>
                <td>{a.locale}</td>
                <td>
                  <span className={styles.statusBadge} data-status={a.status}>{a.status}</span>
                </td>
                <td>{new Date(a.created_at).toLocaleDateString("ar-QA")}</td>
                <td>
                  <div className={styles.actions}>
                    <button className={styles.editBtn} onClick={() => openEdit(a)}>تعديل</button>
                    <button className={styles.deleteBtn} onClick={() => deleteArticle(a)}>حذف</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Modal open={modal} onClose={() => { setModal(false); setEditId(null); }} title={editId ? "تعديل المقال" : "مقال جديد"} size="lg">
        <form onSubmit={submit} className={styles.form}>
          <Field label="العنوان">
            <Input name="title" required defaultValue={EMPTY.title} />
          </Field>
          <Field label="الرابط (slug)">
            <Input name="slug" required defaultValue={EMPTY.slug} placeholder="my-article" />
          </Field>
          <div className={styles.row}>
            <Field label="التصنيف">
              <Input name="category" defaultValue={EMPTY.category} />
            </Field>
            <Field label="اللغة">
              <Select name="locale" defaultValue="ar">
                <option value="ar">العربية</option>
                <option value="en">English</option>
              </Select>
            </Field>
            <Field label="الحالة">
              <Select name="status" defaultValue="draft">
                <option value="draft">مسودة</option>
                <option value="published">منشور</option>
                <option value="archived">مؤرشف</option>
              </Select>
            </Field>
          </div>
          <Field label="رابط صورة الغلاف">
            <Input name="cover_image_url" defaultValue={EMPTY.cover_image_url} placeholder="https://..." />
          </Field>
          <Field label="ملخص">
            <Textarea name="summary" defaultValue={EMPTY.summary} />
          </Field>
          <Field label="المحتوى (HTML)">
            <Textarea name="content_html" defaultValue={EMPTY.content_html} rows={12} />
          </Field>
          <Button type="submit" size="lg" disabled={loading}>
            {loading ? "جارٍ..." : editId ? "حفظ" : "نشر"}
          </Button>
        </form>
      </Modal>
    </div>
  );
}
