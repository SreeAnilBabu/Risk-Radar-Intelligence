/**
 * userRole.ts — minimal persona switcher used by RiskRadar's role-aware UI.
 *
 * Three roles map directly to the Passport personas in the BRD:
 *
 *   RISKRADAR_FULL_ACCESS  → Legal Operations Director (May)   — full edit
 *   RISKRADAR_EXEC_VIEW    → General Counsel             (John) — read-only
 *   RISKRADAR_MATTER_VIEW  → Legal Bill Reviewer         (Brian)— invoice scope
 *
 * The role is stored in localStorage so a refresh keeps the chosen view, and
 * exposed via a tiny hook so React components can subscribe. In production this
 * would come from the auth/SSO layer (P_USER → P_ROLE_GRANTS → P_ROLE) instead.
 */
import { useEffect, useState } from "react";

export type UserRole = "RISKRADAR_FULL_ACCESS" | "RISKRADAR_EXEC_VIEW" | "RISKRADAR_MATTER_VIEW";

const STORAGE_KEY = "riskradar.userRole";
const DEFAULT_ROLE: UserRole = "RISKRADAR_FULL_ACCESS";

export const ROLE_LABELS: Record<UserRole, string> = {
  RISKRADAR_FULL_ACCESS: "Legal Ops Director",
  RISKRADAR_EXEC_VIEW: "General Counsel",
  RISKRADAR_MATTER_VIEW: "Legal Bill Reviewer"
};

function readRole(): UserRole {
  if (typeof window === "undefined") return DEFAULT_ROLE;
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === "RISKRADAR_FULL_ACCESS" || stored === "RISKRADAR_EXEC_VIEW" || stored === "RISKRADAR_MATTER_VIEW") {
    return stored;
  }
  return DEFAULT_ROLE;
}

export function useUserRole(): [UserRole, (role: UserRole) => void] {
  const [role, setRole] = useState<UserRole>(readRole);

  // Keep tabs and components in sync when the role changes elsewhere.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setRole(readRole());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const update = (next: UserRole) => {
    window.localStorage.setItem(STORAGE_KEY, next);
    setRole(next);
    // Manually broadcast for same-tab listeners (storage event only fires across tabs).
    window.dispatchEvent(new StorageEvent("storage", { key: STORAGE_KEY, newValue: next }));
  };

  return [role, update];
}
