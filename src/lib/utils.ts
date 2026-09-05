import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function money(amount: number, currency = "INR") {
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

export function num(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

export function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function formatDay(iso: string | null | undefined) {
  if (!iso) return "—";
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function formatDayShort(iso: string | null | undefined) {
  if (!iso) return "—";
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export function formatTime(value: string | null | undefined) {
  if (!value) return "";
  return value.slice(0, 5);
}

export function tripStatus(start: string, end: string, now = todayISO()) {
  if (end < now) return "completed" as const;
  if (start > now) return "upcoming" as const;
  return "ongoing" as const;
}

export const CURRENCIES = ["INR", "USD", "EUR", "GBP", "JPY", "AUD", "SGD"] as const;
export const EXPENSE_CATEGORIES = [
  "Transport",
  "Food",
  "Lodging",
  "Activities",
  "Shopping",
  "Fees",
  "Other",
] as const;
export const PACKING_SLOTS = ["documents", "clothes", "gear", "health", "other"] as const;
