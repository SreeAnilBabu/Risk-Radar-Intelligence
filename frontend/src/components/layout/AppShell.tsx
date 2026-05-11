import { Link, NavLink, Outlet } from "react-router-dom";
import { useRefresh } from "../../app/state/refreshContext";

/**
 * RiskRadar is launched as an external app from the Passport "Risk Intelligence"
 * tile (opens in a new browser tab, similar to IBM Cognos). Therefore we do NOT
 * render the Passport chrome (Wolters Kluwer banner, Matter & Spend label,
 * Submitted button, Apps/Menu/Home, or the Matters/Organizations/People/etc.
 * tabs). RiskRadar owns its full window and only renders its own slim header.
 */

const navItems = [
  { to: "/", label: "Dashboard", end: true },
  { to: "/alerts", label: "Risk Triage" },
  { to: "/insights", label: "Insights" }
];

export function AppShell() {
  const { lastCompletedAt, refresh } = useRefresh();

  return (
    <div>
      <header className="rr-header">
        <Link to="/" className="rr-brand" title="Go to Dashboard" style={{ textDecoration: "none", color: "inherit" }}>
          <span className="rr-brand-icon">⚡</span>
          <div className="rr-brand-text">
            <span className="rr-brand-name">RiskRadar</span>
            <span className="rr-brand-sub">Risk Intelligence for Legal Operations</span>
          </div>
        </Link>

        <nav className="rr-nav">
          {navItems.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) => `rr-navlink${isActive ? " active" : ""}`}
            >
              {n.label}
            </NavLink>
          ))}
        </nav>

        <div className="rr-tools">
          <button type="button" className="rr-refresh" onClick={refresh} title="Refresh data">
            ↻ Refresh
            {lastCompletedAt && (
              <span className="rr-refresh-time">
                · {new Date(lastCompletedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
          </button>
        </div>
      </header>

      <main>
        <Outlet />
      </main>
    </div>
  );
}
