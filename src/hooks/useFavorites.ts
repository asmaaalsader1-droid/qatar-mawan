"use client";

import { useCallback, useEffect, useState } from "react";

const KEY = "khdm-qatar-favorites";

export function useFavorites() {
  const [favorites, setFavorites] = useState<string[]>([]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setFavorites(JSON.parse(raw));
    } catch {
      // ignore
    }
  }, []);

  const persist = (list: string[]) => {
    setFavorites(list);
    if (typeof window !== "undefined") localStorage.setItem(KEY, JSON.stringify(list));
  };

  const isFav = useCallback((id: string) => favorites.includes(id), [favorites]);

  const toggleFav = useCallback(
    (id: string): boolean => {
      let next: string[];
      if (favorites.includes(id)) {
        next = favorites.filter((f) => f !== id);
      } else {
        next = [...favorites, id];
      }
      persist(next);
      return next.includes(id);
    },
    [favorites],
  );

  return { favorites, isFav, toggleFav };
}
