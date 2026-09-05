import { Link, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { UserButton } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { useMyProfile } from "@/lib/tripwise/hooks";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui";
import { Logo } from "./logo";

const links = [
  { to: "/", label: "Board" },
  { to: "/journal", label: "Journal" },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const { user, isPending } = useCurrentUserState();
  const profile = useMyProfile(Boolean(user));
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="flex min-h-screen flex-col bg-bg text-fg">
      <header className="sticky top-0 z-30 border-b border-line/70 bg-bg/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-3 px-4">
          <Logo />
          <nav className="hidden items-center gap-1 sm:flex">
            {links.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={cn(
                  "rounded-md px-3 py-2 text-sm font-medium text-muted no-underline transition-colors hover:text-fg",
                  pathname === link.to && "bg-bg-sunken text-fg",
                )}
              >
                {link.label}
              </Link>
            ))}
            {profile.data?.isAdmin ? (
              <Link
                to="/admin"
                className={cn(
                  "rounded-md px-3 py-2 text-sm font-medium text-muted no-underline transition-colors hover:text-fg",
                  pathname === "/admin" && "bg-bg-sunken text-fg",
                )}
              >
                Admin
              </Link>
            ) : null}
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/trips/new" className="hidden no-underline sm:inline-flex">
              <Button variant="accent" size="sm">
                New trip
              </Button>
            </Link>
            {isPending ? (
              <div className="size-9 animate-pulse rounded-full bg-bg-sunken" />
            ) : user ? (
              <div className="flex items-center gap-2">
                <Link
                  to="/profile"
                  className="hidden text-sm font-medium text-muted no-underline hover:text-fg md:inline"
                >
                  {user.displayName?.split(" ")[0] ?? "You"}
                </Link>
                <UserButton />
              </div>
            ) : (
              <Link to="/login" className="no-underline">
                <Button variant="secondary" size="sm">
                  Sign in
                </Button>
              </Link>
            )}
          </div>
        </div>
        <div className="flex gap-1 overflow-x-auto border-t border-line/60 px-3 py-1 sm:hidden">
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={cn(
                "shrink-0 rounded-md px-3 py-2 text-sm font-medium text-muted no-underline",
                pathname === link.to && "bg-bg-sunken text-fg",
              )}
            >
              {link.label}
            </Link>
          ))}
          <Link to="/trips/new" className="shrink-0 rounded-md px-3 py-2 text-sm font-medium text-accent no-underline">
            New trip
          </Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>
      <footer className="border-t border-line/70 py-6 text-center text-xs text-muted">
        TripWise — plan together, pack once, keep the journal.
      </footer>
    </div>
  );
}
