import { Navigate, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "../../app/state/authContext";

/** Route gate: redirect to /login if not authenticated. Preserves the
 *  attempted path so we can return after successful sign-in. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const location = useLocation();
  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname + location.search }}
      />
    );
  }
  return <>{children}</>;
}
