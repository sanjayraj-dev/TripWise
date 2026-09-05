import { createFileRoute, Link } from "@tanstack/react-router";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { AppShell } from "@/components/tripwise/app-shell";
import { Button } from "@/components/ui";
import { useAdminOverview, useMyProfile, useSetUserActive } from "@/lib/tripwise/hooks";
import { formatDay, money } from "@/lib/utils";

export const Route = createFileRoute("/admin")({ component: AdminPage });

function AdminPage() {
  const { user, isPending } = useCurrentUserState();
  const me = useMyProfile(Boolean(user));
  const admin = useAdminOverview(Boolean(me.data?.isAdmin));
  const setActive = useSetUserActive();

  if (isPending || me.isPending) {
    return (
      <AppShell>
        <div className="h-40 animate-pulse rounded-xl bg-bg-sunken" />
      </AppShell>
    );
  }
  if (!user) return <RedirectToSignIn />;
  if (!me.data?.isAdmin) {
    return (
      <AppShell>
        <div className="paper rounded-xl p-8 shadow-border">
          <h1 className="font-display text-3xl">Administrators only</h1>
          <p className="mt-2 text-sm text-muted">This desk is locked.</p>
          <Link to="/" className="mt-4 inline-block no-underline">
            <Button variant="secondary">Back to the board</Button>
          </Link>
        </div>
      </AppShell>
    );
  }

  const data = admin.data;

  return (
    <AppShell>
      <p className="text-xs font-medium tracking-[0.18em] text-muted uppercase">Administration</p>
      <h1 className="mb-6 font-display text-4xl">Operations</h1>
      <div className="mb-8 grid gap-3 sm:grid-cols-4">
        <Stat label="Travelers" value={String(data?.travelers ?? "—")} />
        <Stat label="Active accounts" value={String(data?.activeTravelers ?? "—")} />
        <Stat label="Trips" value={String(data?.trips ?? "—")} />
        <Stat label="Logged spend" value={money(data?.spend ?? 0)} />
      </div>

      <h2 className="mb-3 font-display text-2xl">Travelers</h2>
      <div className="mb-10 overflow-x-auto rounded-xl shadow-border">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-bg-sunken text-xs tracking-wide text-muted uppercase">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Trips</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody className="bg-surface">
            {(data?.users ?? []).map((u) => (
              <tr key={u.id} className="border-t border-line">
                <td className="px-4 py-3">
                  {u.name}
                  {u.isAdmin ? <span className="ml-2 text-xs text-accent">admin</span> : null}
                </td>
                <td className="px-4 py-3 text-muted">{u.email}</td>
                <td className="px-4 py-3 tabular-nums">{u.tripCount}</td>
                <td className="px-4 py-3">{u.isActive ? "Active" : "Deactivated"}</td>
                <td className="px-4 py-3 text-right">
                  {u.id === user.id ? null : (
                    <Button
                      size="sm"
                      variant={u.isActive ? "secondary" : "primary"}
                      disabled={setActive.isPending}
                      onClick={() => setActive.mutate({ userId: u.id, isActive: !u.isActive })}
                    >
                      {u.isActive ? "Deactivate" : "Activate"}
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="mb-3 font-display text-2xl">Recent trips</h2>
      <ul className="paper divide-y divide-line rounded-xl shadow-border">
        {(data?.recentTrips ?? []).map((t) => (
          <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
            <div>
              <Link to="/trips/$tripId" params={{ tripId: String(t.id) }} className="font-medium">
                {t.title}
              </Link>
              <p className="text-xs text-muted">
                {t.ownerName} · {formatDay(t.startDate)} – {formatDay(t.endDate)}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </AppShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="paper rounded-xl p-4 shadow-border">
      <p className="text-xs font-medium tracking-[0.16em] text-muted uppercase">{label}</p>
      <p className="mt-1 font-display text-2xl tabular-nums">{value}</p>
    </div>
  );
}
