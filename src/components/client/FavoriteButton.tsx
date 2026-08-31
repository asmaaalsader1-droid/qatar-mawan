"use client";

import { useEffect, useState } from "react";
import { useFavorites } from "@/hooks/useFavorites";
import styles from "./FavoriteButton.module.css";

export function FavoriteButton({
  workerId,
  label,
  savedLabel,
}: {
  workerId: string;
  label: string;
  savedLabel: string;
}) {
  const { isFav, toggleFav } = useFavorites();
  const [fav, setFav] = useState(false);

  useEffect(() => {
    setFav(isFav(workerId));
  }, [workerId, isFav]);

  return (
    <button
      className={`${styles.btn} ${fav ? styles.active : ""}`}
      onClick={() => {
        const next = toggleFav(workerId);
        setFav(next);
      }}
    >
      {fav ? `♥ ${savedLabel}` : `♡ ${label}`}
    </button>
  );
}
