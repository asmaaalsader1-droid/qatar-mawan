"use client";

import { ReactNode } from "react";
import styles from "./Badge.module.css";

type BadgeVariant = "available" | "booked" | "verified" | "neutral" | "pending" | "confirmed";

export function Badge({ variant = "neutral", children }: { variant?: BadgeVariant; children: ReactNode }) {
  return <span className={`${styles.badge} ${styles[variant]}`}>{children}</span>;
}
