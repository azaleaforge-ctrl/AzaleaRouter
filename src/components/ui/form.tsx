"use client";

import { forwardRef, useId } from "react";

/* Permanent labels are mandatory (PRD §4.3) — placeholders never replace them. */

export function Label({
  htmlFor,
  children,
  required,
  className = "",
}: {
  htmlFor?: string;
  children: React.ReactNode;
  required?: boolean;
  className?: string;
}) {
  return (
    <label htmlFor={htmlFor} className={`block text-[13px] font-medium text-ink ${className}`}>
      {children}
      {required ? (
        <span className="ml-1 text-danger" aria-hidden="true">
          *
        </span>
      ) : null}
    </label>
  );
}

const CONTROL =
  "w-full rounded-control border bg-surface px-3 py-2 text-sm text-ink placeholder:text-muted/70 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-60";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { invalid, className = "", ...rest },
  ref,
) {
  return (
    <input
      ref={ref}
      aria-invalid={invalid || undefined}
      className={`${CONTROL} ${invalid ? "border-danger" : "border-line hover:border-line-strong"} ${className}`}
      {...rest}
    />
  );
});

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }
>(function Textarea({ invalid, className = "", ...rest }, ref) {
  return (
    <textarea
      ref={ref}
      aria-invalid={invalid || undefined}
      className={`${CONTROL} min-h-24 ${invalid ? "border-danger" : "border-line hover:border-line-strong"} ${className}`}
      {...rest}
    />
  );
});

export const Select = forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }
>(function Select({ invalid, className = "", children, ...rest }, ref) {
  return (
    <select
      ref={ref}
      aria-invalid={invalid || undefined}
      className={`${CONTROL} appearance-none bg-[url('data:image/svg+xml;utf8,<svg%20xmlns=%22http://www.w3.org/2000/svg%22%20width=%2212%22%20height=%2212%22%20viewBox=%220%200%2024%2024%22%20fill=%22none%22%20stroke=%22%23667085%22%20stroke-width=%222.5%22><path%20d=%22M6%209l6%206%206-6%22/></svg>')] bg-[position:right_0.75rem_center] bg-no-repeat pr-9 ${invalid ? "border-danger" : "border-line hover:border-line-strong"} ${className}`}
      {...rest}
    >
      {children}
    </select>
  );
});

export function Checkbox({
  label,
  className = "",
  ...rest
}: React.InputHTMLAttributes<HTMLInputElement> & { label: React.ReactNode }) {
  const id = useId();
  return (
    <span className={`inline-flex items-start gap-2.5 ${className}`}>
      <input
        id={id}
        type="checkbox"
        className="mt-0.5 size-4 shrink-0 cursor-pointer rounded border-line text-primary accent-[var(--primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        {...rest}
      />
      <label htmlFor={id} className="text-[13px] leading-5 text-ink">
        {label}
      </label>
    </span>
  );
}

/** Accessible switch: a real button with role="switch". */
export function Switch({
  checked,
  onChange,
  label,
  disabled = false,
  description,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  disabled?: boolean;
  description?: string;
}) {
  return (
    <span className="flex items-center justify-between gap-4">
      <span className="min-w-0">
        <span className="block text-[13px] font-medium text-ink">{label}</span>
        {description ? <span className="mt-0.5 block text-xs text-muted">{description}</span> : null}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-50 ${
          checked ? "bg-primary" : "bg-line-strong"
        }`}
      >
        <span
          aria-hidden="true"
          className={`inline-block size-4.5 translate-x-1 rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-[22px]" : ""
          }`}
        />
      </button>
    </span>
  );
}

/** Field wires label, control, hint, and error with full aria plumbing. */
export function Field({
  label,
  required,
  error,
  hint,
  children,
  className = "",
}: {
  label: string;
  required?: boolean;
  error?: string | null;
  hint?: string;
  children: (ids: { id: string; describedBy: string; invalid: boolean }) => React.ReactNode;
  className?: string;
}) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(" ");
  return (
    <div className={`space-y-1.5 ${className}`}>
      <Label htmlFor={id} required={required}>
        {label}
      </Label>
      {children({ id, describedBy, invalid: Boolean(error) })}
      {hint && !error ? (
        <p id={hintId} className="text-xs text-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} role="alert" className="text-xs font-medium text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
