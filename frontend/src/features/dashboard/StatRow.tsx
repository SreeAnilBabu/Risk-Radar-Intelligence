import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { passportMatters, pct } from "../../data/passportSeed";
import { getPortfolioStats, type PortfolioStats } from "../../services/endpoints";

/** Stat tiles — clickable. Each tile routes to /matters/:level filtered by
 *  level. Numbers come from `GET /api/portfolio/stats` which is a single
 *  SQL aggregate, so we never have to materialise the full portfolio just
 *  to count buckets. Falls back to the seed counts only if the API call
 *  fails (e.g. offline demo). */
export function StatRow() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<PortfolioStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getPortfolioStats()
      .then((res) => {
        if (!cancelled) setStats(res);
      })
      .catch((err) => {
        // Defensive: keep the dashboard usable even when the API is down.
        console.warn("[StatRow] /api/portfolio/stats failed, using seed:", err);
        if (!cancelled) {
          const critical = passportMatters.filter((m) => m.level === "critical").length;
          const warning = passportMatters.filter((m) => m.level === "warning").length;
          const healthy = passportMatters.filter((m) => m.level === "healthy").length;
          const avgRisk =
            Math.round(
              passportMatters.reduce((s, m) => s + Math.max(0, pct(m.actual, m.budget)), 0) /
                passportMatters.length
            ) + 18;
          setStats({ critical, warning, healthy, totalActive: critical + warning + healthy, avgRiskScore: avgRisk, topRisk: "Budget Burn" });
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const critical = stats?.critical ?? 0;
  const warning = stats?.warning ?? 0;
  const healthy = stats?.healthy ?? 0;
  const display = (n: number) => (loading ? "—" : n.toLocaleString());

  return (
    <div className="stat-row">
      <Tile tone="red" label="Critical Matters" num={display(critical)} detail="Require Action"
        sub="Budget >25% over" trend={`${critical} live from Passport`} trendUp
        onClick={() => navigate("/matters/critical")}
        title={`Click to view all ${critical} Critical matters`} />
      <Tile tone="amber" label="Warning Matters" num={display(warning)} detail="Monitor Closely"
        sub="Budget 0–25% over" trend={`${warning} live from Passport`} trendUp
        onClick={() => navigate("/matters/warning")}
        title={`Click to view all ${warning} Warning matters`} />
      <Tile tone="green" label="Healthy Matters" num={display(healthy)} detail="On Track"
        sub="Within budget" trend={`${healthy} live from Passport`} trendUp={false}
        onClick={() => navigate("/matters/healthy")}
        title={`Click to view all ${healthy} Healthy matters`} />
    </div>
  );
}

function Tile({
  tone, label, num, detail, sub, trend, trendUp, onClick, title
}: {
  tone: "red" | "amber" | "green" | "blue";
  label: string; num: number | string; detail: string; sub: string; trend: string; trendUp: boolean;
  onClick: () => void; title: string;
}) {
  return (
    <button type="button" className={`stat-w ${tone} clickable`} onClick={onClick} title={title}>
      <div className="stat-w-hdr">{label}</div>
      <div className="stat-w-body">
        <div className={`stat-num ${tone}`}>{num}</div>
        <div className="stat-detail">
          <div className="stat-lbl">{detail}</div>
          <div className="stat-sub">{sub}</div>
          <div className={`stat-trend ${trendUp ? "trend-up" : "trend-dn"}`}>{trend}</div>
          <div className="stat-click-hint">Click to view matters →</div>
        </div>
      </div>
    </button>
  );
}
