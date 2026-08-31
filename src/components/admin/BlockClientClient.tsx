"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { useToast } from "@/components/ui/Toast";
import styles from "./BlockClientClient.module.css";

type Client = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  ip: string | null;
  country: string | null;
  fingerprint: string;
  created_at: string;
  is_blocked: boolean;
};

type Blocked = {
  id: string;
  ip: string | null;
  fingerprint: string | null;
  reason: string | null;
  created_at: string;
};

export function BlockClientClient({
  recentClients,
  blocked,
}: {
  recentClients: Client[];
  blocked: Blocked[];
}) {
  const toast = useToast();
  // مطابقة سريعة: خريطة من fingerprint → blocked_id لمعرفة حالة الحظر
  const blockedByFp = new Map(
    blocked
      .filter((b) => b.fingerprint)
      .map((b) => [b.fingerprint as string, b.id]),
  );

  return (
    <div>
      <h1 className={styles.title}>العملاء ({recentClients.length})</h1>
      <p className={styles.hint}>
        استخدم زر «حظر» أو «إلغاء الحظر» بجانب كل عميل للتحكم في وصوله للموقع.
      </p>

      {recentClients.length === 0 ? (
        <Card>
          <p className={styles.empty}>لا يوجد عملاء بعد.</p>
        </Card>
      ) : (
        <Card className={styles.tableCard}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>الاسم</th>
                <th>البريد</th>
                <th>الهاتف</th>
                <th>الدولة</th>
                <th>التاريخ</th>
                <th>الحالة</th>
                <th>إجراء</th>
              </tr>
            </thead>
            <tbody>
              {recentClients.map((c) => {
                const blockedId = blockedByFp.get(c.fingerprint) ?? null;
                const isBlocked = !!blockedId || c.is_blocked;
                return (
                  <tr key={c.id}>
                    <td>{c.name || "—"}</td>
                    <td>{c.email || "—"}</td>
                    <td>{c.phone || "—"}</td>
                    <td>{c.country || "—"}</td>
                    <td>{new Date(c.created_at).toLocaleDateString("ar-QA")}</td>
                    <td>
                      {isBlocked ? (
                        <span className={styles.badge}>محظور</span>
                      ) : (
                        <span className={styles.activeBadge}>نشط</span>
                      )}
                    </td>
                    <td>
                      <BlockToggle
                        client={c}
                        blockedId={blockedId}
                        isBlocked={isBlocked}
                        onDone={() => window.location.reload()}
                        toast={toast}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

function BlockToggle({
  client,
  blockedId,
  isBlocked,
  onDone,
  toast,
}: {
  client: Client;
  blockedId: string | null;
  isBlocked: boolean;
  onDone: () => void;
  toast: ReturnType<typeof useToast>;
}) {
  const [loading, setLoading] = useState(false);

  async function toggle() {
    setLoading(true);
    try {
      if (isBlocked && blockedId) {
        // إلغاء الحظر
        const res = await fetch("/api/admin/block-client", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: blockedId }),
        });
        if (res.ok) {
          toast.push("تم إلغاء الحظر", "success");
          onDone();
        } else {
          toast.push("فشل", "error");
        }
      } else {
        // حظر
        const res = await fetch("/api/admin/block-client", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ip: client.ip,
            fingerprint: client.fingerprint,
            reason: "حظر يدوي من لوحة التحكم",
          }),
        });
        if (res.ok) {
          toast.push("تم حظر العميل", "success");
          onDone();
        } else {
          toast.push("فشل", "error");
        }
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      className={isBlocked ? styles.unblockBtn : styles.blockBtn}
      onClick={toggle}
      disabled={loading}
    >
      {loading ? "..." : isBlocked ? "إلغاء الحظر" : "حظر"}
    </button>
  );
}
