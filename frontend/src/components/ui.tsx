import { useEffect, useState } from "react";
import { X } from "lucide-react";

export function Logo({ light = false, compact = false }: { light?: boolean; compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <span
        className={`grid h-9 w-9 place-items-center rounded-xl ${light ? "bg-terracotta/20 text-terracotta" : "bg-ink text-terracotta"}`}
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
          <path d="M12 2.5l1.8 5.4H20l-4.4 3.2 1.7 5.4L12 13.8 6.7 16.5l1.7-5.4L4 7.9h6.2L12 2.5z" />
        </svg>
      </span>
      {!compact && (
        <span className={`serif text-xl tracking-tight ${light ? "text-paper" : "text-ink"}`}>
          TripWise
        </span>
      )}
    </div>
  );
}

export function Button({
  children,
  variant = "primary",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "danger" | "soft" }) {
  const styles = {
    primary: "bg-terracotta text-white hover:bg-terracotta-dark",
    ghost: "bg-transparent text-ink hover:bg-paper-2",
    danger: "bg-danger text-white hover:bg-danger/90",
    soft: "bg-ink text-paper hover:bg-navy",
  }[variant];
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium transition disabled:opacity-50 ${styles} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-muted">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}

export const inputClass =
  "w-full rounded-xl border border-line bg-white/70 px-3.5 py-2.5 text-sm text-ink outline-none transition placeholder:text-muted/70 focus:border-ink/40 focus:ring-2 focus:ring-terracotta/20";

export function Modal({
  open,
  title,
  onClose,
  children,
  wide = false,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-4 sm:items-center" onClick={onClose}>
      <div
        className={`max-h-[90vh] overflow-y-auto rounded-3xl bg-paper p-6 shadow-2xl ${wide ? "w-full max-w-xl" : "w-full max-w-md"}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 className="serif text-2xl text-ink">{title}</h2>
          <button onClick={onClose} className="rounded-full p-1 text-muted hover:bg-paper-2" aria-label="Close">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel = "Delete",
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  body: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Modal open={open} title={title} onClose={onClose}>
      <p className="mb-6 text-sm leading-relaxed text-ink-soft">{body}</p>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose} type="button">
          Cancel
        </Button>
        <Button variant="danger" onClick={onConfirm} type="button">
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}

export function Empty({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-dashed border-line bg-white/40 px-8 py-14 text-center">
      <h3 className="serif text-2xl text-ink">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-ink-soft">{body}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ToastHost({ message, onDone }: { message: string | null; onDone: () => void }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (!message) return;
    setShow(true);
    const t = setTimeout(() => {
      setShow(false);
      onDone();
    }, 2800);
    return () => clearTimeout(t);
  }, [message, onDone]);
  if (!message || !show) return null;
  return (
    <div className="fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 rounded-full bg-ink px-4 py-2.5 text-sm text-paper shadow-lg">
      {message}
    </div>
  );
}

export function passwordScore(pw: string) {
  const checks = [
    pw.length >= 8,
    /[A-Z]/.test(pw),
    /[a-z]/.test(pw),
    /\d/.test(pw),
    /[^A-Za-z0-9]/.test(pw),
  ];
  return checks.filter(Boolean).length;
}
