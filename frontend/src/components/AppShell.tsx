import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { CalendarDays, Compass, LayoutDashboard, LineChart, LogOut, Map, Search, Shield, UserRound } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { Logo } from "./ui";

const travelerNav = [
  { to: "/app", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/app/discover", label: "Discover", icon: Search, end: false },
  { to: "/app/trips", label: "Trips", icon: Map, end: false },
  { to: "/app/calendar", label: "Calendar", icon: CalendarDays, end: false },
  { to: "/app/insights", label: "Insights", icon: LineChart, end: false },
  { to: "/app/profile", label: "Profile", icon: UserRound, end: false },
];

export function AppShell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.role === "admin";
  const items = isAdmin
    ? [
        { to: "/admin", label: "Admin", icon: Shield, end: true },
        { to: "/app/profile", label: "Profile", icon: UserRound, end: false },
      ]
    : travelerNav;

  async function onLogout() {
    await logout();
    navigate("/");
  }

  return (
    <div className="grain min-h-screen bg-paper lg:flex">
      <aside className="hidden w-64 shrink-0 flex-col bg-navy px-5 py-6 text-paper lg:flex">
        <Logo light />
        <p className="mt-2 px-1 text-xs text-paper/50">Smart travel companion</p>
        <nav className="mt-10 flex flex-1 flex-col gap-1">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm transition ${
                  isActive ? "bg-white/10 text-paper" : "text-paper/70 hover:bg-white/5 hover:text-paper"
                }`
              }
            >
              <item.icon size={18} />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto border-t border-white/10 pt-4">
          <div className="px-2 text-sm font-medium">{user?.full_name}</div>
          <div className="px-2 text-xs text-paper/50">{user?.email}</div>
          <button
            onClick={onLogout}
            className="mt-3 flex w-full items-center gap-2 rounded-2xl px-3 py-2 text-sm text-paper/70 hover:bg-white/5"
          >
            <LogOut size={16} /> Sign out
          </button>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-line bg-paper/90 px-4 py-3 backdrop-blur lg:hidden">
          <Logo compact />
          <span className="serif text-lg">TripWise</span>
          <button onClick={onLogout} className="text-sm text-ink-soft">
            Sign out
          </button>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-8 pb-24 lg:px-10 lg:py-10">
          <Outlet />
        </main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-20 flex justify-around border-t border-line bg-paper/95 px-2 py-2 backdrop-blur lg:hidden">
        {(isAdmin ? items : travelerNav).map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 rounded-xl py-1 text-[11px] ${isActive ? "text-terracotta" : "text-muted"}`
            }
          >
            <item.icon size={18} />
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

export function PublicFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="grain min-h-screen bg-paper">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <a href="/" className="flex items-center gap-2">
          <Logo />
        </a>
        <div className="flex items-center gap-2 text-sm">
          <a href="/login" className="rounded-full px-4 py-2 text-ink-soft hover:bg-paper-2">
            Sign in
          </a>
          <a href="/register" className="rounded-full bg-ink px-4 py-2 text-paper">
            Get started
          </a>
        </div>
      </header>
      {children}
    </div>
  );
}

export function CompassMark() {
  return <Compass className="text-terracotta" size={18} />;
}
