import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

type AuthUser = { username: string; displayName: string; ssoFromPassport: boolean };

type AuthState = {
  user: AuthUser | null;
  login: (username: string, password: string) => { ok: true } | { ok: false; error: string };
  ssoLogin: () => { ok: true } | { ok: false; error: string };
  logout: () => void;
};

const AuthCtx = createContext<AuthState | null>(null);
const STORAGE_KEY = "riskradar.auth.user";

/**
 * Simulated SSO with Passport. In production the Passport host would post a
 * signed token via postMessage / a cookie. For this prototype:
 *   – if `?sso=1` is on the URL we treat it as a Passport-trusted launch,
 *   – the only authorised SSO username is `admin`,
 *   – any user can also sign in manually with admin / admin.
 */
const PASSPORT_AUTHORISED_USERS = new Set(["admin"]);
const SAMPLE_USERNAME = "admin";
const SAMPLE_PASSWORD = "admin";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as AuthUser) : null;
    } catch {
      return null;
    }
  });

  // Try a one-shot SSO if the URL has ?sso=<username>; if the user has access,
  // sign them in silently. Otherwise fall through to the login form.
  useEffect(() => {
    if (user) return;
    const params = new URLSearchParams(window.location.search);
    const sso = params.get("sso");
    if (sso && PASSPORT_AUTHORISED_USERS.has(sso)) {
      const u: AuthUser = { username: sso, displayName: "System System", ssoFromPassport: true };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
      setUser(u);
    }
  }, [user]);

  const value = useMemo<AuthState>(
    () => ({
      user,
      login(username, password) {
        if (username !== SAMPLE_USERNAME || password !== SAMPLE_PASSWORD) {
          return { ok: false, error: "Invalid username or password." };
        }
        const u: AuthUser = { username, displayName: "System System", ssoFromPassport: false };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
        setUser(u);
        return { ok: true };
      },
      ssoLogin() {
        const params = new URLSearchParams(window.location.search);
        const sso = params.get("sso");
        if (!sso) return { ok: false, error: "No Passport SSO session detected." };
        if (!PASSPORT_AUTHORISED_USERS.has(sso)) {
          return { ok: false, error: `Account "${sso}" does not have RiskRadar access. Sign in below to continue.` };
        }
        const u: AuthUser = { username: sso, displayName: "System System", ssoFromPassport: true };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
        setUser(u);
        return { ok: true };
      },
      logout() {
        localStorage.removeItem(STORAGE_KEY);
        setUser(null);
      }
    }),
    [user]
  );

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
