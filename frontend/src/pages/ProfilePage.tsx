import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../auth/AuthContext";
import { api, setToken } from "../api/client";
import { Button, Field, inputClass, passwordScore } from "../components/ui";

type Contact = { id: number; name: string; phone: string; email: string };

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
      const res = await api<{ access_token?: string }>("/api/profile/password", {
        method: "POST",
        json: { current_password: current, new_password: next },
      });
      if (res.access_token) setToken(res.access_token);
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

      <EmergencyContacts />
    </div>
  );
}

function EmergencyContacts() {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [err, setErr] = useState("");
  const q = useQuery({
    queryKey: ["contacts"],
    queryFn: () => api<Contact[]>("/api/profile/contacts"),
  });
  const add = useMutation({
    mutationFn: () => api("/api/profile/contacts", { method: "POST", json: { name, phone, email } }),
    onSuccess: () => {
      setName("");
      setPhone("");
      setEmail("");
      setErr("");
      qc.invalidateQueries({ queryKey: ["contacts"] });
    },
    onError: (e: Error) => setErr(e.message),
  });
  const remove = useMutation({
    mutationFn: (id: number) => api(`/api/profile/contacts/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["contacts"] }),
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!name.trim()) return;
        add.mutate();
      }}
      className="mt-6 space-y-4 rounded-3xl border border-line bg-white/50 p-6"
    >
      <h2 className="serif text-2xl">Emergency contacts</h2>
      <p className="text-sm text-ink-soft">SOS on a trip pings these people. Dummy dispatch for the lab — no SMS goes out.</p>
      <ul className="space-y-2">
        {(q.data ?? []).map((c) => (
          <li key={c.id} className="flex items-center justify-between rounded-2xl border border-line bg-white px-3 py-2 text-sm">
            <span>
              {c.name}
              {c.phone ? ` · ${c.phone}` : ""}
              {c.email ? ` · ${c.email}` : ""}
            </span>
            <button type="button" className="text-xs text-danger" onClick={() => remove.mutate(c.id)}>
              Remove
            </button>
          </li>
        ))}
        {!q.data?.length && <li className="text-sm text-muted">None yet — add one so SOS has somewhere to go.</li>}
      </ul>
      <Field label="Name">
        <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} required />
      </Field>
      <Field label="Phone">
        <input className={inputClass} value={phone} onChange={(e) => setPhone(e.target.value)} />
      </Field>
      <Field label="Email">
        <input className={inputClass} type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </Field>
      {err && <p className="text-sm text-danger">{err}</p>}
      <Button type="submit" disabled={add.isPending}>Add contact</Button>
    </form>
  );
}
