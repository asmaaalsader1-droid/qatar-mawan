"use client";

import { useEffect, useState } from "react";
import { subscribeToTable } from "@/lib/realtime";
import { createClient } from "@/lib/supabase/client";

export function useRealtime<T>(
  table: string,
  initialData: T[],
  idField: keyof T = "id" as keyof T,
): T[] {
  const [items, setItems] = useState<T[]>(initialData);

  useEffect(() => {
    setItems(initialData);
    const channel = subscribeToTable<T>(
      table,
      "*",
      ({ new: newRow, eventType }) => {
        setItems((prev) => {
          if (eventType === "DELETE") {
            return prev.filter((item) => item[idField] !== (newRow as T)[idField]);
          }
          const exists = prev.some((item) => item[idField] === (newRow as T)[idField]);
          if (exists) {
            return prev.map((item) =>
              item[idField] === (newRow as T)[idField] ? (newRow as T) : item,
            );
          }
          return [newRow as T, ...prev];
        });
      },
    );
    return () => {
      void channel.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return items;
}

export function useRealtimeCount(table: string, initial: number): number {
  const [count, setCount] = useState(initial);
  useEffect(() => {
    const supabase = createClient();
    const channel = subscribeToTable<unknown>(
      table,
      "*",
      () => {
        supabase
          .from(table)
          .select("*", { count: "exact", head: true })
          .then(({ count: c }) => setCount(c ?? 0));
      },
    );
    return () => void channel.unsubscribe();
  }, [table]);
  return count;
}
