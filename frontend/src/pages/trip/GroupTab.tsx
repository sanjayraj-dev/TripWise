import { api } from "../../api/client";
import { Button } from "../../components/ui";
import type { Member, TripDetail } from "../../types";

export function GroupTab({ trip, onChange }: { trip: TripDetail; onChange: () => void }) {
  const members = trip.members ?? [];
  const active = members.filter((m) => m.status === "active");
  const pending = members.filter((m) => m.status === "pending");
  const isOwner = trip.my_role === "owner";

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section>
        <h2 className="serif text-2xl">Crew</h2>
        <ul className="mt-4 space-y-2">
          {active.map((m) => (
            <li key={m.id} className="flex items-center justify-between rounded-2xl border border-line bg-white/60 px-4 py-3">
              <div>
                <p className="font-medium">{m.full_name}</p>
                <p className="text-xs text-muted">{m.role}{m.home_city ? ` · ${m.home_city}` : ""}{m.travel_style ? ` · ${m.travel_style}` : ""}</p>
              </div>
              {isOwner && m.role !== "owner" && (
                <button className="text-xs text-danger" onClick={async () => { await api(`/api/trips/${trip.id}/members/${m.user_id}`, { method: "DELETE" }); onChange(); }}>
                  Remove
                </button>
              )}
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h2 className="serif text-2xl">Join requests</h2>
        {pending.length === 0 ? (
          <p className="mt-4 text-sm text-muted">No one waiting.</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {pending.map((m) => (
              <PendingRow key={m.id} tripId={trip.id} member={m} canApprove={isOwner} onChange={onChange} />
            ))}
          </ul>
        )}
        {isOwner && (
          <p className="mt-6 text-sm text-ink-soft">
            Visibility is <strong>{trip.visibility}</strong>, join mode <strong>{trip.join_mode}</strong>. Change it in Edit.
          </p>
        )}
        {!isOwner && (
          <Button
            variant="ghost"
            className="mt-6"
            onClick={async () => {
              await api(`/api/trips/${trip.id}/leave`, { method: "POST" });
              window.location.href = "/app/discover";
            }}
          >
            Leave group
          </Button>
        )}
      </section>
    </div>
  );
}

function PendingRow({ tripId, member, canApprove, onChange }: { tripId: number; member: Member; canApprove: boolean; onChange: () => void }) {
  return (
    <li className="flex items-center justify-between rounded-2xl border border-line bg-white/60 px-4 py-3">
      <div>
        <p className="font-medium">{member.full_name}</p>
        <p className="text-xs text-muted">{member.email}</p>
      </div>
      {canApprove && (
        <Button
          onClick={async () => {
            await api(`/api/trips/${tripId}/members/${member.user_id}/approve`, { method: "POST" });
            onChange();
          }}
        >
          Approve
        </Button>
      )}
    </li>
  );
}
