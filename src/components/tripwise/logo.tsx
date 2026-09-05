import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

export function CompassMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("size-8 shrink-0", className)} aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="#2F4A3C" />
      <polygon points="16,3 20.5,16 16,29 11.5,16" fill="#F3E9D7" />
      <polygon points="3,16 16,11.5 29,16 16,20.5" fill="#C46B4A" />
      <circle cx="16" cy="16" r="3.1" fill="#2A2118" />
      <circle cx="16" cy="16" r="1.4" fill="#F3E9D7" />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <Link to="/" className={cn("flex items-center gap-2 text-fg no-underline", className)}>
      <CompassMark />
      <span className="font-display text-xl leading-none tracking-tight">TripWise</span>
    </Link>
  );
}
