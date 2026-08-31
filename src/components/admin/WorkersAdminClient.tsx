"use client";

import { useState, useRef } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea, Select } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { Worker } from "@/lib/supabase/types";
import { EMPLOYMENT_CATEGORIES, EmploymentCategory } from "@/lib/supabase/types";
import { formatSalary } from "@/lib/utils";
import styles from "./WorkersAdminClient.module.css";

const EMPLOYMENT_LABELS: Record<EmploymentCategory, string> = {
  hourly: "بالساعة",
  daily: "باليوم",
  monthly: "بالشهر",
  yearly: "بالسنة",
  new: "جديدة",
  recruitment: "استقدام",
};

const EMPTY = {
  full_name: "",
  nationality: "فلبينية",
  experience_years: 3,
  languages: ["العربية", "الإنجليزية"],
  religion: "",
  marital_status: "",
  children_count: 0,
  expected_salary: 1500,
  skills: [] as string[],
  photo_url: "",
  availability: "available" as const,
  employment_type: ["monthly"] as string[],
  terms: "",
  return_policy: "",
};

type EditingState = { worker: Worker } | null;

export function WorkersAdminClient({ workers }: { workers: Worker[] }) {
  const toast = useToast();
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<EditingState>(null);
  const [loading, setLoading] = useState(false);
  const [skillsText, setSkillsText] = useState("");
  const [langsText, setLangsText] = useState("العربية، الإنجليزية");
  const [countriesText, setCountriesText] = useState("");
  const [bioText, setBioText] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(["monthly"]);
  const fileRef = useRef<HTMLInputElement>(null);

  function toggleCategory(cat: string) {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat],
    );
  }

  function openAdd() {
    setEditing(null);
    setSkillsText("");
    setLangsText("العربية، الإنجليزية");
    setCountriesText("");
    setBioText("");
    setPhotoUrl("");
    setSelectedCategories(["monthly"]);
    setModal(true);
  }

  function openEdit(w: Worker) {
    setEditing({ worker: w });
    setSkillsText((w.skills ?? []).join("، "));
    setLangsText((w.languages ?? []).join("، "));
    setCountriesText((w.previous_countries ?? []).join("، "));
    setBioText(w.bio ?? "");
    setPhotoUrl(w.photo_url ?? "");
    setSelectedCategories(w.employment_type ?? ["monthly"]);
    setModal(true);
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/upload-photo", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        toast.push(data.error || "فشل رفع الصورة", "error");
        return;
      }
      setPhotoUrl(data.url);
      toast.push("تم رفع الصورة", "success");
    } catch {
      toast.push("فشل رفع الصورة", "error");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const form = e.currentTarget;
    const data = new FormData(form);
    const skills = (skillsText || "").split(/[،,]/).map((s) => s.trim()).filter(Boolean);
    const languages = (langsText || "").split(/[،,]/).map((s) => s.trim()).filter(Boolean);
    const previous_countries = (countriesText || "").split(/[،,]/).map((s) => s.trim()).filter(Boolean);

    const payload = {
      full_name: String(data.get("full_name") ?? ""),
      nationality: String(data.get("nationality") ?? ""),
      experience_years: Number(data.get("experience_years") ?? 0),
      languages,
      religion: String(data.get("religion") ?? "") || null,
      marital_status: String(data.get("marital_status") ?? "") || null,
      children_count: Number(data.get("children_count") ?? 0),
      expected_salary: Number(data.get("expected_salary") ?? 0),
      skills,
      photo_url: photoUrl || (editing?.worker.photo_url ?? ""),
      availability: String(data.get("availability") ?? "available"),
      employment_type: selectedCategories.length ? selectedCategories : ["monthly"],
      terms: String(data.get("terms") ?? "") || null,
      return_policy: String(data.get("return_policy") ?? "") || null,
      previous_countries,
      bio: bioText || null,
    };

    const res = editing
      ? await fetch(`/api/admin/workers/${editing.worker.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
      : await fetch("/api/admin/workers", {
          method: "POST",
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
    toast.push(editing ? "تم تعديل العاملة" : "تمت إضافة العاملة", "success");
    setModal(false);
    window.location.reload();
  }

  async function toggleAvailability(w: Worker) {
    const next = w.availability === "available" ? "booked" : "available";
    const res = await fetch(`/api/admin/workers/${w.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ availability: next }),
    });
    if (res.ok) {
      toast.push("تم التحديث", "success");
      window.location.reload();
    } else {
      toast.push("فشل", "error");
    }
  }

  async function deleteWorker(w: Worker) {
    if (!confirm(`حذف ${w.full_name}؟`)) return;
    const res = await fetch(`/api/admin/workers/${w.id}`, { method: "DELETE" });
    if (res.ok) {
      toast.push("تم الحذف", "success");
      window.location.reload();
    } else {
      toast.push("فشل", "error");
    }
  }

  return (
    <div>
      <div className={styles.header}>
        <h1 className={styles.title}>العاملات ({workers.length})</h1>
        <Button onClick={openAdd}>+ إضافة عاملة</Button>
      </div>

      <Card className={styles.tableCard}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>الصورة</th>
              <th>الاسم</th>
              <th>الجنسية</th>
              <th>الراتب</th>
              <th>التوفر</th>
              <th>إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {workers.map((w) => (
              <tr key={w.id}>
                <td><img src={w.photo_url} alt={w.full_name} className={styles.thumb} /></td>
                <td>{w.full_name}</td>
                <td>{w.nationality}</td>
                <td>{formatSalary(w.expected_salary, "ar")}</td>
                <td>
                  <span className={styles.statusBadge} data-status={w.availability}>
                    {w.availability === "available" ? "متاح" : "محجوز"}
                  </span>
                </td>
                <td>
                  <div className={styles.actions}>
                    <button className={styles.editBtn} onClick={() => openEdit(w)}>
                      تعديل
                    </button>
                    <button className={styles.actBtn} onClick={() => toggleAvailability(w)}>
                      تبديل
                    </button>
                    <button className={styles.deleteBtn} onClick={() => deleteWorker(w)}>
                      حذف
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? "تعديل بيانات العاملة" : "إضافة عاملة جديدة"} size="lg">
        <form onSubmit={submit} className={styles.form}>
          <div className={styles.row}>
            <Field label="الاسم الكامل">
              <Input name="full_name" required defaultValue={editing?.worker.full_name ?? EMPTY.full_name} />
            </Field>
            <Field label="الجنسية">
              <Input name="nationality" required defaultValue={editing?.worker.nationality ?? EMPTY.nationality} />
            </Field>
          </div>
          <div className={styles.row}>
            <Field label="سنوات الخبرة">
              <Input name="experience_years" type="number" required defaultValue={editing?.worker.experience_years ?? EMPTY.experience_years} />
            </Field>
            <Field label="الراتب المتوقع (ر.ق)">
              <Input name="expected_salary" type="number" required defaultValue={editing?.worker.expected_salary ?? EMPTY.expected_salary} />
            </Field>
          </div>
          <div className={styles.row}>
            <Field label="الديانة">
              <Input name="religion" defaultValue={editing?.worker.religion ?? EMPTY.religion} />
            </Field>
            <Field label="الحالة الاجتماعية">
              <Input name="marital_status" defaultValue={editing?.worker.marital_status ?? EMPTY.marital_status} />
            </Field>
            <Field label="عدد الأطفال">
              <Input name="children_count" type="number" defaultValue={editing?.worker.children_count ?? EMPTY.children_count} />
            </Field>
          </div>
          <Field label="اللغات (افصل بفاصلة)">
            <Input value={langsText} onChange={(e) => setLangsText(e.target.value)} />
          </Field>
          <Field label="المهارات (افصل بفاصلة)">
            <Input value={skillsText} onChange={(e) => setSkillsText(e.target.value)} placeholder="تنظيف، طبخ، رعاية أطفال" />
          </Field>
          <Field label="الدول السابقة (افصل بفاصلة)">
            <Input value={countriesText} onChange={(e) => setCountriesText(e.target.value)} placeholder="السعودية، الإمارات، لبنان" />
          </Field>
          <Field label="نبذة تعريفية">
            <Textarea value={bioText} onChange={(e) => setBioText(e.target.value)} placeholder="عاملة إثيوبية، خبرة 5 سنوات، عملت في السعودية والإمارات..." />
          </Field>

          <Field label="صورة العاملة">
            <div className={styles.uploadRow}>
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={handleUpload}
                className={styles.fileInput}
                id="worker-photo"
              />
              <label htmlFor="worker-photo" className={styles.uploadLabel}>
                {uploading ? "جارٍ الرفع..." : "📂 اختر صورة من الجهاز"}
              </label>
              {photoUrl && (
                <img src={photoUrl} alt="معاينة" className={styles.preview} />
              )}
            </div>
          </Field>

          <div className={styles.row}>
            <Field label="التوفر">
              <Select name="availability" defaultValue={editing?.worker.availability ?? "available"}>
                <option value="available">متاح</option>
                <option value="booked">محجوز</option>
              </Select>
            </Field>
          </div>
          <Field label="تصنيفات العمالة (يمكن اختيار أكثر من خيار)">
            <div className={styles.categoriesGrid}>
              {EMPLOYMENT_CATEGORIES.map((cat) => (
                <label key={cat} className={styles.categoryChip}>
                  <input
                    type="checkbox"
                    checked={selectedCategories.includes(cat)}
                    onChange={() => toggleCategory(cat)}
                  />
                  <span>{EMPLOYMENT_LABELS[cat]}</span>
                </label>
              ))}
            </div>
          </Field>
          <Field label="الشروط الخاصة">
            <Textarea name="terms" defaultValue={editing?.worker.terms ?? EMPTY.terms} />
          </Field>
          <Field label="سياسة الاسترجاع">
            <Textarea name="return_policy" defaultValue={editing?.worker.return_policy ?? EMPTY.return_policy} />
          </Field>
          <Button type="submit" size="lg" disabled={loading || uploading}>
            {loading ? "جارٍ..." : editing ? "حفظ التعديلات" : "إضافة"}
          </Button>
        </form>
      </Modal>
    </div>
  );
}
