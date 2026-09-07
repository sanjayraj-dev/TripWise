import { useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { api } from "../api/client";
import { Button, Field, inputClass, passwordScore } from "../components/ui";

export function ProfilePage() {
  const { user, refresh } = useAuth();
  const [name, setName] = useState(user?.full_name ?? "");
  const [bio, setBio] = useState(user?.bio ?? "");
  const [home, setHome] = useState(user?.home_city ?? "");
  const [style, setStyle] = useState(user?.travel_style ?? "flexible");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    try {
      await api("/api/profile", { method: "PUT", json: { full_name: name, bio, home_city: home, travel_style: style } });
      await refresh();
      setMsg("Profile updated.");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not update profile.");
    }
  }

  async function savePassword(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    try {
      await api("/api/profile/password", { method: "POST", json: { current_password: current, new_password: next } });
      setCurrent("");
      setNext("");
      setMsg("Password changed.");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not change password.");
    }
  }

  const score = passwordScore(next);

  return (
    <div className="max-w-xl">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-terracotta">Account</p>
      <h1 className="serif mt-2 text-4xl">Profile</h1>
      <p className="mt-2 text-ink-soft">{user?.email}</p>
      {msg && <p className="mt-4 text-sm text-sage-dark">{msg}</p>}
      {err && <p className="mt-4 text-sm text-danger">{err}</p>}

      <form onSubmit={saveProfile} className="mt-8 space-y-4 rounded-3xl border border-line bg-white/50 p-6">
        <Field label="Full name">
          <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} required />
        </Field>
        <Field label="Home city">
          <input className={inputClass} value={home} onChange={(e) => setHome(e.target.value)} />
        </Field>
        <Field label="Travel style">
          <select className={inputClass} value={style} onChange={(e) => setStyle(e.target.value)}>
            <option value="flexible">Flexible</option>
            <option value="culture">Culture</option>
            <option value="adventure">Adventure</option>
            <option value="leisure">Leisure</option>
            <option value="family">Family</option>
          </select>
        </Field>
        <Field label="Bio">
          <textarea className={inputClass} rows={3} value={bio} onChange={(e) => setBio(e.target.value)} />
        </Field>
        <Button type="submit">Save profile</Button>
      </form>

      <form onSubmit={savePassword} className="mt-6 space-y-4 rounded-3xl border border-line bg-white/50 p-6">
        <h2 className="serif text-2xl">Password</h2>
        <Field label="Current password">
          <input className={inputClass} type="password" value={current} onChange={(e) => setCurrent(e.target.value)} required />
        </Field>
        <Field label="New password" hint="Upper, lower, digit, special, 8+ characters.">
          <input className={inputClass} type="password" value={next} onChange={(e) => setNext(e.target.value)} required />
        </Field>
        <div className="flex gap-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <span key={i} className={`h-1 flex-1 rounded-full ${i < score ? "bg-sage" : "bg-line"}`} />
          ))}
        </div>
        <Button type="submit">Update password</Button>
      </form>
    </div>
  );
}
