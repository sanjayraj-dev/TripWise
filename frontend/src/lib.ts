import type { TripCard } from "./types";

const CURRENCY: Record<string, string> = { INR: "₹", EUR: "€", USD: "$", JPY: "¥", GBP: "£" };

export function money(n: number, currency = "INR") {
  const s = CURRENCY[currency] ?? `${currency} `;
  return `${s}${Math.round(n).toLocaleString("en-IN")}`;
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

const COVERS = [
  "/art/cover-japan.jpg",
  "/art/cover-europe.jpg",
  "/art/cover-tropics.jpg",
  "/art/cover-city.jpg",
  "/art/cover-alpine.jpg",
  "/art/cover-desert.jpg",
];

export function coverArt(title: string, cities: string[] = []) {
  const blob = `${title} ${cities.join(" ")}`.toLowerCase();
  if (/kyoto|tokyo|osaka|japan|seoul|nara/.test(blob)) return "/art/cover-japan.jpg";
  if (/goa|bali|phuket|hawaii|maldiv|beach|kochi/.test(blob)) return "/art/cover-tropics.jpg";
  if (/lisbon|porto|paris|rome|prague|barcelona|madrid|vienna|europe|london/.test(blob)) return "/art/cover-europe.jpg";
  if (/alps|swiss|norway|iceland|zermatt/.test(blob)) return "/art/cover-alpine.jpg";
  if (/marrakech|jaipur|desert|cairo|jaisalmer/.test(blob)) return "/art/cover-desert.jpg";
  if (/nyc|shanghai|dubai|singapore|night/.test(blob)) return "/art/cover-city.jpg";
  let h = 0;
  for (const c of blob) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return COVERS[h % COVERS.length];
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
  for (let d = new Date(a); d <= b && out.length < 60; d.setDate(d.getDate() + 1)) {
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
