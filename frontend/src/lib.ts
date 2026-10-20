import type { TripCard } from "./types";

const CURRENCY: Record<string, string> = { INR: "₹", EUR: "€", USD: "$", JPY: "¥", GBP: "£" };

export function money(n: number, currency = "INR") {
  const s = CURRENCY[currency] ?? `${currency} `;
  return `${s}${Math.round(n).toLocaleString("en-IN")}`;
}

export function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function localIso(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function parseDay(iso: string | null | undefined): Date | null {
  if (!iso || typeof iso !== "string") return null;
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return null;
  const dt = new Date(y, m - 1, d);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

export function prettyDate(iso: string | null | undefined) {
  const dt = parseDay(iso);
  if (!dt) return iso || "";
  return dt.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function shortDate(iso: string) {
  const dt = parseDay(iso);
  if (!dt) return iso || "";
  return dt.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export function weekday(iso: string) {
  const dt = parseDay(iso);
  if (!dt) return "";
  return dt.toLocaleDateString("en-IN", { weekday: "short" });
}

export function daysUntil(iso: string) {
  const start = parseDay(iso);
  if (!start) return 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((start.getTime() - today.getTime()) / 86400000);
}

export function tripLength(start: string, end: string) {
  const a = parseDay(start);
  const b = parseDay(end);
  if (!a || !b) return 1;
  return Math.round((b.getTime() - a.getTime()) / 86400000) + 1;
}

export function coverFor(title: string): [string, string] {
  const palettes: [string, string][] = [
    ["#1B2A4A", "#E07A5F"],
    ["#2F4858", "#D4A373"],
    ["#3D405B", "#81B29A"],
    ["#4A2545", "#E07A5F"],
    ["#1D3557", "#E9C46A"],
    ["#283618", "#DDA15E"],
  ];
  let h = 0;
  for (const c of title) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return palettes[h % palettes.length];
}

export function coverArt(title: string, cities: string[] = []) {
  const [from, to] = coverFor(`${title} ${cities.join(" ")}`);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice">
    <defs>
      <linearGradient id="g" x1="0" y1="1" x2="1" y2="0">
        <stop offset="0" stop-color="${from}"/>
        <stop offset="1" stop-color="${to}"/>
      </linearGradient>
    </defs>
    <rect width="1600" height="900" fill="url(#g)"/>
    <circle cx="1280" cy="160" r="300" fill="#ffffff" fill-opacity="0.08"/>
    <circle cx="220" cy="780" r="360" fill="#000000" fill-opacity="0.14"/>
  </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export function statusLabel(status: TripCard["status"]) {
  if (status === "ongoing") return "In progress";
  if (status === "completed") return "Completed";
  return "Upcoming";
}

export function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export function eachDay(start: string, end: string) {
  const out: string[] = [];
  const a = parseDay(start);
  const b = parseDay(end);
  if (!a || !b || a > b) return out;
  for (let d = new Date(a); d <= b && out.length < 366; d.setDate(d.getDate() + 1)) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    out.push(`${y}-${m}-${day}`);
  }
  return out;
}

export const ACTIVITY_TONES: Record<string, string> = {
  Sightseeing: "bg-ink/10 text-ink",
  Culture: "bg-terracotta/15 text-terracotta-dark",
  Food: "bg-gold/30 text-ink",
  Nature: "bg-sage/15 text-sage-dark",
  Transit: "bg-ink-soft/10 text-ink-soft",
  Rest: "bg-paper-3 text-ink",
};

export const TRIP_TYPES = ["leisure", "culture", "adventure", "family", "work"] as const;
export const ACTIVITY_CATEGORIES = ["Sightseeing", "Culture", "Food", "Nature", "Transit", "Rest"] as const;
export const DOCUMENT_KINDS = ["Passport", "Visa", "Ticket", "Insurance", "Permit", "Other"] as const;
