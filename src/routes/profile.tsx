import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { authClient } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { AppShell } from "@/components/tripwise/app-shell";
import { Button, Field, Input } from "@/components/ui";
import { useMyProfile, useUpdateProfile } from "@/lib/tripwise/hooks";
import { passwordIssues } from "@/lib/tripwise/password";
import { toast } from "sonner";

export const Route = createFileRoute("/profile")({ component: ProfilePage });

function ProfilePage() {
  const { user, isPending } = useCurrentUserState();
  const profile = useMyProfile(Boolean(user));
  const update = useUpdateProfile();
  const [name, setName] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwBusy, setPwBusy] = useState(false);
  const issues = useMemo(() => passwordIssues(newPassword), [newPassword]);

  useEffect(() => {
    if (profile.data?.fullName) setName(profile.data.fullName);
  }, [profile.data?.fullName]);

  if (isPending) {
    return (
      <AppShell>
        <div className="h-40 animate-pulse rounded-xl bg-bg-sunken" />
      </AppShell>
    );
  }
  if (!user) return <RedirectToSignIn />;

  function onName(e: FormEvent) {
    e.preventDefault();
    update.mutate(name);
  }

  async function onPassword(e: FormEvent) {
    e.preventDefault();
    if (issues.length) {
      setPwError(`New password needs ${issues.join(", ")}.`);
      return;
    }
    setPwError(null);
    setPwBusy(true);
    try {
      const result = await authClient.changePassword({
        currentPassword,
        newPassword,
        revokeOtherSessions: true,
      });
      if (result.error) throw new Error(result.error.message || "Could not change password.");
      setCurrentPassword("");
      setNewPassword("");
      toast.success("Password updated.");
    } catch (err) {
      setPwError(err instanceof Error ? err.message : "Could not change password.");
    } finally {
      setPwBusy(false);
    }
  }

  return (
    <AppShell>
      <p className="text-xs font-medium tracking-[0.18em] text-muted uppercase">Account</p>
      <h1 className="mb-6 font-display text-4xl">Profile</h1>
      <div className="grid max-w-2xl gap-6">
        <form onSubmit={onName} className="paper space-y-3 rounded-xl p-5 shadow-border">
          <Field label="Full name">
            <Input value={name} onChange={(e) => setName(e.target.value)} required />
          </Field>
          <Field label="Email">
            <Input value={profile.data?.email ?? user.primaryEmail ?? ""} disabled />
          </Field>
          <Button type="submit" disabled={update.isPending}>
            Save profile
          </Button>
        </form>
        <form onSubmit={onPassword} className="paper space-y-3 rounded-xl p-5 shadow-border">
          <h2 className="font-display text-2xl">Change password</h2>
          <Field label="Current password">
            <Input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </Field>
          <Field label="New password" hint="8+ characters, upper, lower, digit, special.">
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              autoComplete="new-password"
            />
          </Field>
          {pwError ? <p className="text-sm text-danger">{pwError}</p> : null}
          <Button type="submit" disabled={pwBusy}>
            {pwBusy ? "Updating…" : "Update password"}
          </Button>
        </form>
      </div>
    </AppShell>
  );
}
