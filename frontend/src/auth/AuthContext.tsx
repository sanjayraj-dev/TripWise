import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api, getToken, setToken } from "../api/client";
import type { User } from "../types";

type AuthState = {
  user: User | null;
  ready: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (full_name: string, email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  async function refresh() {
    if (!getToken()) {
      setUser(null);
      setReady(true);
      return;
    }
    try {
      const me = await api<User>("/api/auth/me");
      setUser(me);
    } catch {
      setToken(null);
      setUser(null);
    } finally {
      setReady(true);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function login(email: string, password: string) {
    const res = await api<{ access_token: string; user: User }>("/api/auth/login", {
      method: "POST",
      json: { email, password },
    });
    setToken(res.access_token);
    setUser(res.user);
    return res.user;
  }

  async function register(full_name: string, email: string, password: string) {
    const res = await api<{ access_token: string; user: User }>("/api/auth/register", {
      method: "POST",
      json: { full_name, email, password },
    });
    setToken(res.access_token);
    setUser(res.user);
    return res.user;
  }

  async function logout() {
    try {
      await api("/api/auth/logout", { method: "POST" });
    } catch {
      /* token drop is enough */
    }
    setToken(null);
    setUser(null);
  }

  const value = useMemo(
    () => ({ user, ready, login, register, logout, refresh }),
    [user, ready],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("AuthProvider missing");
  return ctx;
}
