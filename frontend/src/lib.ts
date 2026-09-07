import type { TripCard } from "./types";

const CURRENCY: Record<string, string> = { INR: "₹", EUR: "€", USD: "$", JPY: "¥", GBP: "£" };

export function money(n: number, currency = "INR") {
  const s = CURRENCY[currency] ?? `${currency} `;
  return `${s}${Math.round(n).toLocaleString("en-IN")}`;
}

export function prettyDate(iso: string) {
  const d = new Date(iso + (iso.length === 10 ? "T00:00:00" : ""));
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function shortDate(iso: string) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export function weekday(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-IN", { weekday: "short" });
}

export function daysUntil(iso: string) {
  const start = new Date(iso + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((start.getTime() - today.getTime()) / 86400000);
}

export function tripLength(start: string, end: string) {
  const a = new Date(start + "T00:00:00");
  const b = new Date(end + "T00:00:00");
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
  const a = new Date(start + "T00:00:00");
  const b = new Date(end + "T00:00:00");
  for (let d = new Date(a); d <= b; d.setDate(d.getDate() + 1)) {
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

export const ACTIVITY_TONES: Record<string, string> = {
  Sightseeing: "bg-ink text-paper",
  Culture: "bg-terracotta text-white",
  Food: "bg-gold text-ink",
  Nature: "bg-sage text-white",
  Transit: "bg-ink-soft text-paper",
  Rest: "bg-paper-3 text-ink",
};

export const TRIP_TYPES = ["leisure", "culture", "adventure", "family", "work"] as const;
export const ACTIVITY_CATEGORIES = ["Sightseeing", "Culture", "Food", "Nature", "Transit", "Rest"] as const;
export const DOCUMENT_KINDS = ["Passport", "Visa", "Ticket", "Insurance", "Permit", "Other"] as const;
