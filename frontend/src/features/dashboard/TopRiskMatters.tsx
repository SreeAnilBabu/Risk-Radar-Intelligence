import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Widget } from "./Widget";
import { listMatters } from "../../services/endpoints";
import type { MatterRiskRecord } from "../../types/domain";

/**
 * Top Risk Matters — live, refreshes whenever the parent dashboard's data
 * source updates. Pulls the top N critical matters from the API and lets
 * the user jump straight into the AI briefing for the highest-risk row.
 *
 * Replaces the old seed-data version which navigated to non-existent
 * `MAT-…` IDs and never refreshed.
 */
const TOP_N = 5;

function tone(score: number): "red" | "amber" {
  return score >= 75 ? "red" : "amber";
}

function relativeTime(iso?: string | null): string {
  if (!iso) return "—";
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return "—";
  const diffMs = Date.now() - then;
  const m = Math.round(diffMs / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  return `${d}d ago`;
}

export function TopRiskMatters() {
  const navigate = useNavigate();
  const [matters, setMatters] = useState<MatterRiskRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    listMatters({ level: "critical", size: TOP_N, page: 1 })
      .then((rows) => { if (!cancelled) setMatters(rows ?? []); })
      .catch(() => { if (!cancelled) setMatters([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  return (
    <Widget id="topRiskMatters" title="Top Risk Matters">
      <div>
        {loading && <div className="alert-sub" style={{ padding: 8 }}>Loading…</div>}
        {!loading && matters.length === 0 && (
          <div className="alert-sub" style={{ padding: 8 }}>No critical matters right now. Nice work.</div>
        )}
        {matters.map((m) => (
          <button
            key={m.id}
            type="button"
            className="alert-item"
            onClick={() => navigate(`/briefing/${encodeURIComponent(m.id)}`, { state: { from: "dashboard" } })}
            title={m.title}
          >
            <div className="alert-title">
              <span className={`adot ${tone(m.riskScore)}`} /> {m.title}
            </div>
            <div className="alert-sub">
              {m.jurisdictionCode ?? m.jurisdictionId} · risk {Math.round(m.riskScore)}
            </div>
            <div className="alert-time">{relativeTime(m.updatedAt)}</div>
          </button>
        ))}
        {matters.length > 0 && (
          <button type="button" className="view-all-btn" onClick={() => navigate("/matters/critical")}>
            View All Critical →
          </button>
        )}
      </div>
    </Widget>
  );
}
