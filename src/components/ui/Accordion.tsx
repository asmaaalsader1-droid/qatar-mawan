"use client";

import { useState, ReactNode } from "react";
import styles from "./Accordion.module.css";

export function AccordionItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={styles.item}>
      <button
        className={styles.question}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <span>{question}</span>
        <span className={`${styles.icon} ${open ? styles.open : ""}`}>▾</span>
      </button>
      {open && <div className={styles.answer}>{answer}</div>}
    </div>
  );
}

export function Accordion({ items }: { items: { question?: string; answer?: string; q?: string; a?: string }[] }) {
  return (
    <div className={styles.accordion}>
      {items.map((item, i) => (
        <AccordionItem
          key={i}
          question={item.question ?? item.q ?? ""}
          answer={item.answer ?? item.a ?? ""}
        />
      ))}
    </div>
  );
}
