import { useEffect, useState, type FormEvent } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../app/state/authContext";

/**
 * RiskRadar login screen — also handles "auto-SSO from Passport".
 * Concept: when launched from the Passport "Risk Intelligence" tile,
 * Passport opens RiskRadar in a new tab. If the signed-in Passport user
 * has access to RiskRadar, they're auto-signed-in (SSO). Otherwise they
 * see this form. The sample credentials are admin / admin.
 */
export function LoginPage() {
  const { user, login, ssoLogin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo =
    (location.state as { from?: string } | null)?.from ??
    new URLSearchParams(location.search).get("returnTo") ??
    "/";

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [ssoMessage, setSsoMessage] = useState<string | null>(null);

  // Try Passport SSO once on mount.
  useEffect(() => {
    if (user) return;
    const params = new URLSearchParams(window.location.search);
    if (!params.get("sso")) return;
    const result = ssoLogin();
    if (!result.ok) setSsoMessage(result.error);
  }, [user, ssoLogin]);

  if (user) return <Navigate to={redirectTo} replace />;

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!username.trim() || !password) {
      setError("Please enter both username and password.");
      return;
    }
    const result = login(username.trim(), password);
    if (result.ok) {
      navigate(redirectTo, { replace: true });
    } else {
      setError(result.error);
    }
  };

  return (
    <div className="rr-login-bg">
      <form className="rr-login-card" onSubmit={onSubmit}>
        <div className="rr-login-brand">
          <span className="rr-login-icon">⚡</span>
          <div>
            <div className="rr-login-name">RiskRadar</div>
            <div className="rr-login-sub">Risk Intelligence for Legal Operations</div>
          </div>
        </div>

        {ssoMessage && <div className="rr-login-sso-msg">{ssoMessage}</div>}

        <label className="rr-login-label">
          <span>Username</span>
          <input
            type="text"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="admin"
          />
        </label>

        <label className="rr-login-label">
          <span>Password</span>
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="admin"
          />
        </label>

        {error && (
          <div role="alert" className="rr-login-error">
            ⚠ {error}
          </div>
        )}

        <button type="submit" className="rr-login-btn">Sign in</button>

        <div className="rr-login-foot">
          <span>Sample credentials: <strong>admin</strong> / <strong>admin</strong></span>
        </div>
      </form>
    </div>
  );
}
