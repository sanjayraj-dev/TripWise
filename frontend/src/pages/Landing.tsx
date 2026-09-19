import { ArrowRight, CalendarDays, Compass, LineChart, MapPinned, Share2, Wallet } from "lucide-react";
import { PublicFrame } from "../components/AppShell";

const features = [
  { icon: MapPinned, title: "Route + map", body: "Stops geocode themselves. The path of the trip sits on OpenStreetMap, not in a list." },
  { icon: CalendarDays, title: "A plotted calendar", body: "Every activity and departure lands on a month grid you can actually brief from." },
  { icon: Wallet, title: "Live money", body: "Categorized spend, remaining budget, and a ring that turns when you overshoot." },
  { icon: LineChart, title: "Insights", body: "Nights, cities, and where the money actually went — across every trip you’ve kept." },
  { icon: Share2, title: "Shareable briefing", body: "A public itinerary link for the people meeting you. No account required on their side." },
  { icon: Compass, title: "AI days + weather", body: "Generate a preview itinerary per stop, accept what you want, and pull a forecast onto the map." },
];

const steps = [
  { n: "01", t: "Name the trip", d: "Title, dates, budget. Under five minutes, as the spec requires." },
  { n: "02", t: "Plot the route", d: "Cities become TripStops with coordinates, stays, and a day-wise script." },
  { n: "03", t: "Keep the plot", d: "Spend, packing, papers, weather. One workspace. Nothing in a chat thread." },
];

export function Landing() {
  return (
    <PublicFrame>
      <section className="relative mx-auto max-w-6xl overflow-hidden rounded-[2.2rem] px-0 lg:mt-4">
        <img src="/art/hero.jpg" alt="" className="h-[78vh] min-h-[520px] w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-navy/90 via-navy/55 to-navy/20" />
        <div className="absolute inset-0 flex flex-col justify-end p-8 sm:p-14">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-terracotta">Smart travel companion · v1.3</p>
          <h1 className="serif mt-4 max-w-2xl text-5xl leading-[1.02] text-white sm:text-7xl">
            The trip, held
            <br />
            in one notebook.
          </h1>
          <p className="mt-5 max-w-lg text-base leading-relaxed text-white/75">
            Destinations, days, stays, spend, papers, packing, weather, and a map — instead of twelve chats and a spreadsheet you open on the tarmac.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href="/register" className="inline-flex items-center gap-2 rounded-full bg-terracotta px-6 py-3 text-sm font-medium text-white hover:bg-terracotta-dark">
              Open a notebook <ArrowRight size={16} />
            </a>
            <a href="/login" className="inline-flex items-center rounded-full border border-white/30 px-6 py-3 text-sm text-white hover:bg-white/10">
              Sign in — demo is ready
            </a>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-px overflow-hidden rounded-[1.8rem] border border-line bg-line sm:grid-cols-4 mt-8">
        {[
          ["58", "functional reqs"],
          ["12", "system features"],
          ["2", "user roles"],
          ["∞", "trips per traveler"],
        ].map(([n, l]) => (
          <div key={l} className="bg-paper px-6 py-6">
            <div className="serif text-4xl text-ink">{n}</div>
            <div className="mt-1 text-xs uppercase tracking-[0.16em] text-muted">{l}</div>
          </div>
        ))}
      </section>

      <section className="mx-auto max-w-6xl px-6 py-20">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-terracotta">How it works</p>
        <h2 className="serif mt-3 text-4xl">Three moves. Then the trip has a spine.</h2>
        <div className="mt-10 grid gap-6 lg:grid-cols-3">
          {steps.map((s) => (
            <article key={s.n} className="rounded-[1.6rem] border border-line bg-white/60 p-6">
              <div className="serif text-4xl text-terracotta/80">{s.n}</div>
              <h3 className="mt-4 text-xl font-semibold">{s.t}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">{s.d}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-6 pb-8 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((f) => (
          <article key={f.title} className="rounded-[1.6rem] border border-line bg-white/55 p-6">
            <f.icon className="text-terracotta" size={22} />
            <h3 className="mt-4 font-semibold text-ink">{f.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-ink-soft">{f.body}</p>
          </article>
        ))}
      </section>

      <section className="mx-auto grid max-w-6xl items-center gap-10 px-6 py-16 lg:grid-cols-2">
        <div className="overflow-hidden rounded-[1.8rem]">
          <img src="/art/cover-japan.jpg" alt="" className="h-80 w-full object-cover" />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-terracotta">Seeded briefing</p>
          <h2 className="serif mt-3 text-4xl">Kyoto Autumn is already in the demo.</h2>
          <p className="mt-4 text-ink-soft leading-relaxed">
            Sign in as traveler@tripwise.dev. You’ll get Tokyo → Kyoto, a day-wise script, stays, spend, packing, papers, and coordinates on the map. Admin has the back office.
          </p>
          <a href="/login" className="mt-6 inline-flex rounded-full bg-ink px-5 py-3 text-sm text-paper">
            Open the demo
          </a>
        </div>
      </section>

      <footer className="border-t border-line px-6 py-10 text-center text-xs text-muted">
        TripWise · Software Engineering Laboratory · IEEE SRS v1.2 · Academic Year 2026–2027
      </footer>
    </PublicFrame>
  );
}
