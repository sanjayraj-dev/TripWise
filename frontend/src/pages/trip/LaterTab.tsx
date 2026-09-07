import { CreditCard, Hotel, Phone, Plane } from "lucide-react";

const items = [
  { icon: Plane, title: "Flights", body: "Dummy gate. We’ll wire a real inventory partner later — for now this is a placeholder so the workspace has a home for tickets." },
  { icon: Hotel, title: "Stays to book", body: "Accommodation in TripWise is still manual (as the SRS required). This panel is reserved for a future booking adapter." },
  { icon: CreditCard, title: "Settle up", body: "Split math lives in Budget. A payment rail (Razorpay / Stripe) will sit here — not in this build." },
  { icon: Phone, title: "Voice & video", body: "Group chat is live. Calling needs a media vendor. This button is intentionally a shell." },
];

export function LaterTab() {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-terracotta">Later</p>
      <h2 className="serif mt-2 text-3xl">Book, pay, call — parked on purpose</h2>
      <p className="mt-2 max-w-xl text-sm text-ink-soft">
        These are real product surfaces, not fake bookings. The UI is here so we can plug vendors in without reshaping the trip.
      </p>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {items.map((it) => (
          <article key={it.title} className="rounded-[1.6rem] border border-dashed border-line bg-white/40 p-5">
            <it.icon className="text-terracotta" size={22} />
            <h3 className="mt-3 font-semibold">{it.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-ink-soft">{it.body}</p>
            <button disabled className="mt-4 rounded-full bg-paper-3 px-4 py-2 text-sm text-muted">
              Coming later
            </button>
          </article>
        ))}
      </div>
    </div>
  );
}
