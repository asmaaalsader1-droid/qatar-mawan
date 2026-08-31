"use client";

import { InputHTMLAttributes, TextareaHTMLAttributes, SelectHTMLAttributes, ReactNode, useId } from "react";
import styles from "./Field.module.css";

interface FieldProps {
  label?: string;
  error?: string;
  hint?: string;
  htmlFor?: string;
  children: ReactNode;
}

export function Field({ label, error, hint, htmlFor, children }: FieldProps) {
  return (
    <div className={styles.field}>
      {label && htmlFor ? (
        <label className={styles.label} htmlFor={htmlFor}>{label}</label>
      ) : label ? (
        <span className={styles.label}>{label}</span>
      ) : null}
      {children}
      {hint && !error && <span className={styles.hint}>{hint}</span>}
      {error && <span className={styles.error} role="alert">{error}</span>}
    </div>
  );
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={styles.input} {...props} />;
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={styles.textarea} {...props} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={styles.select} {...props} />;
}

export function Checkbox({ label, ...props }: InputHTMLAttributes<HTMLInputElement> & { label?: string }) {
  const id = useId();
  return (
    <label className={styles.checkbox} htmlFor={id}>
      <input type="checkbox" id={id} {...props} />
      <span>{label}</span>
    </label>
  );
}
