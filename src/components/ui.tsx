import { cva, type VariantProps } from "class-variance-authority";
import type {
  ButtonHTMLAttributes,
  HTMLAttributes,
  InputHTMLAttributes,
  LabelHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 font-medium transition-colors duration-150 disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
  {
    variants: {
      variant: {
        primary: "bg-primary text-primary-fg hover:bg-primary/90",
        accent: "bg-accent text-accent-fg hover:bg-accent/90",
        secondary: "bg-surface text-fg shadow-[inset_0_0_0_1px_var(--color-line)] hover:bg-surface-2",
        ghost: "bg-transparent text-fg hover:bg-bg-sunken",
        danger: "bg-danger text-accent-fg hover:bg-danger/90",
      },
      size: {
        sm: "h-9 rounded-md px-3 text-sm",
        md: "h-11 rounded-lg px-4 text-sm",
        lg: "h-12 rounded-lg px-5 text-base",
        icon: "size-11 rounded-lg",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export function Button({
  className,
  variant,
  size,
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonVariants>) {
  return <button type={type} className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "field h-11 w-full rounded-lg px-3 text-sm text-fg placeholder:text-faint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
        className,
      )}
      {...props}
    />
  );
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "field min-h-24 w-full rounded-lg px-3 py-2 text-sm text-fg placeholder:text-faint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
        className,
      )}
      {...props}
    />
  );
}

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "field h-11 w-full rounded-lg px-3 text-sm text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
        className,
      )}
      {...props}
    />
  );
}

export function Label({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("mb-1.5 block text-sm font-medium text-fg", className)} {...props} />;
}

export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-fg">{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-xs text-muted">{hint}</span> : null}
    </label>
  );
}

export function Badge({
  children,
  tone = "ink",
  className,
}: {
  children: ReactNode;
  tone?: "ink" | "moss" | "accent" | "ok" | "danger";
  className?: string;
}) {
  const tones = {
    ink: "bg-bg-sunken text-fg",
    moss: "bg-moss/15 text-primary",
    accent: "bg-accent/12 text-accent",
    ok: "bg-ok/12 text-ok",
    danger: "bg-danger/12 text-danger",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium tracking-wide",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("paper rounded-xl p-5 shadow-border", className)} {...props} />;
}

export function SectionTitle({
  kicker,
  title,
  action,
}: {
  kicker?: string;
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        {kicker ? (
          <p className="text-xs font-medium tracking-[0.18em] text-muted uppercase">{kicker}</p>
        ) : null}
        <h2 className="font-display text-2xl text-fg">{title}</h2>
      </div>
      {action}
    </div>
  );
}
