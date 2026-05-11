import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { listMattersWithMeta, type MattersListMeta } from "../services/endpoints";
import type { MatterRiskRecord } from "../types/domain";
import {
  deriveStatus,
  getActionTotal,
  statusLabel,
  useActionStatusVersion
} from "../lib/matterActionStatus";

type LevelKey = "critical" | "warning" | "healthy" | "all";

const LABELS: Record<LevelKey, string> = {
  critical: "Critical Matters — Budget >25% Over",
  warning: "Warning Matters — Budget 0–25% Over",
  healthy: "Healthy Matters — Within Budget",
  all: "All Matters — Full Portfolio"
};
const COLORS: Record<LevelKey, string> = {
  critical: "var(--red)", warning: "var(--amber)", healthy: "var(--green)", all: "var(--blue)"
};

const fmtK = (n: number) => `$${Math.round(n / 1000)}K`;

/** Map a server-side riskScore back into the three UI buckets. Mirrors the
 *  bucketing used by /api/portfolio/stats so labels stay consistent. */
function levelOf(m: MatterRiskRecord): "critical" | "warning" | "healthy" {
  if (m.riskScore >= 75) return "critical";
  if (m.riskScore >= 50) return "warning";
  return "healthy";
}

/** Matter list — opened from a dashboard stat tile, a map popup, or the
 *  TopRiskMatters card. Rows come from `GET /api/matters` with the level +
 *  jurisdiction filter pushed down to SQL, so we never bring more than
 *  `size` rows over the wire. */
export function MattersListPage() {
  const { level } = useParams<{ level: LevelKey }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const lvl: LevelKey = level && level in LABELS ? level : "all";
  const jurisdictionId = searchParams.get("jurisdictionId") ?? undefined;

  const [rows, setRows] = useState<MatterRiskRecord[]>([]);
  const [meta, setMeta] = useState<MattersListMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cap page size at 500 (server max). `total` comes from a SQL COUNT(*)
  // so the badge can show "Showing 500 of 3,168" honestly when the
  // result set is larger than the page.
  const PAGE_SIZE = 500;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    listMattersWithMeta({ level: lvl, jurisdictionId, size: PAGE_SIZE })
      .then((envelope) => {
        if (cancelled) return;
        setRows(envelope.data);
        setMeta({
          total: envelope.total,
          page: envelope.page,
          size: envelope.size,
          source: envelope.source
        });
      })
      .catch((err) => {
        const msg = err instanceof Error ? err.message : String(err);
        if (!cancelled) setError(msg);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [lvl, jurisdictionId]);

  const subtitle = useMemo(() => {
    if (loading) return "Loading from Passport…";
    if (error) return `⚠ ${error}`;
    const stateLabel = jurisdictionId && rows[0]?.jurisdictionName ? ` · ${rows[0].jurisdictionName}` : "";
    const sourceLabel = meta?.source === "passport" ? "Passport DB" : "JSON fallback";
    if (meta && meta.total > rows.length) {
      return `Showing ${rows.length.toLocaleString()} of ${meta.total.toLocaleString()} · ${sourceLabel}${stateLabel}`;
    }
    return `${rows.length.toLocaleString()} matter${rows.length === 1 ? "" : "s"} · ${sourceLabel}${stateLabel}`;
  }, [loading, error, rows, meta, jurisdictionId]);

  // Client-side search across the loaded rows. Searches matter number,
  // title, firm/vendor, practice area, and jurisdiction — case-insensitive.
  // Initial value seeded from `?practiceArea=…` so deep links from Top
  // Movers / charts land pre-filtered.
  const initialSearch = searchParams.get("practiceArea") ?? searchParams.get("firm") ?? "";
  const [search, setSearch] = useState(initialSearch);

  // Re-render when any matter's action state flips so the ACTION STATUS
  // pill updates the moment the user toggles a checkbox on the detail page.
  const actionVersion = useActionStatusVersion();
  void actionVersion;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((m) => {
      const haystack = [
        m.matterNumber, m.id, m.title,
        m.vendorName, m.practiceArea,
        m.jurisdictionName, m.jurisdictionCode
      ].filter(Boolean).join(" ").toLowerCase();
      return haystack.includes(q);
    });
  }, [rows, search]);

  return (
    <div className="ml-screen">
      <div className="scr-chrome" style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <button type="button" className="back-btn" onClick={() => navigate("/")}>
          ← Back to Dashboard
        </button>
        <span className="scr-title" style={{ color: COLORS[lvl], flex: "1 1 auto", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{LABELS[lvl]}</span>
        <span
          title={subtitle}
          style={{
            fontSize: 11,
            color: "#dbe7f3",
            background: "rgba(0,0,0,0.18)",
            padding: "4px 10px",
            borderRadius: 12,
            whiteSpace: "nowrap",
            maxWidth: "100%",
            overflow: "hidden",
            textOverflow: "ellipsis",
            flex: "0 1 auto"
          }}
        >
          {subtitle}
        </span>
      </div>

      <div style={{ display: "flex", gap: 8, alignItems: "center", padding: "8px 12px", background: "var(--card-hdr)", borderBottom: "1px solid var(--border)" }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-dim)" }}>🔍 Search</span>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Matter number, name, firm, jurisdiction…"
          style={{
            flex: 1, maxWidth: 420, padding: "5px 10px", fontSize: 12,
            border: "1px solid var(--border)", borderRadius: 4, background: "#fff"
          }}
        />
        {search && (
          <button type="button" className="mlink" style={{ fontSize: 11 }}
            onClick={() => setSearch("")}>clear</button>
        )}
        <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--text-dim)" }}>
          {search ? `${filtered.length} of ${rows.length} match` : `${rows.length} loaded`}
        </span>
      </div>

      <div className="ml-table-wrap">
        <table className="ml-tbl">
          <thead>
            <tr>
              <th>Matter Number</th>
              <th>Matter Name</th>
              <th>Firm / Org</th>
              <th>Practice Area</th>
              <th>Geography</th>
              <th>Budget</th>
              <th>Actual Spend</th>
              <th>Overrun %</th>
              <th>Risk</th>
              <th>Action Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((m) => {
              const budget = m.budgetTotal ?? 0;
              const overrun = budget > 0 ? Math.round(((m.spendToDate - budget) / budget) * 100) : 0;
              const level = levelOf(m);
              const cls = level === "critical" ? "red" : level === "warning" ? "amber" : "green";
              const label = level === "critical" ? "🔴 Critical" : level === "warning" ? "🟡 Warning" : "🟢 Healthy";
              const overrunColor =
                overrun > 25 ? "var(--red)" : overrun > 0 ? "var(--amber)" : "var(--green)";
              const geo = m.jurisdictionName
                ? `${m.jurisdictionName}${m.jurisdictionCode ? `, ${m.jurisdictionCode}` : ""}`
                : m.jurisdictionCode ?? "—";
              return (
                <tr
                  key={m.id}
                  onClick={() =>
                    navigate(`/matter/${m.id}`, { state: { from: "matter-list", level: lvl } })
                  }
                >
                  <td style={{ fontWeight: 700, color: "var(--nav-active)" }}>
                    {m.matterNumber ?? `#${m.id}`}
                  </td>
                  <td>{m.title}</td>
                  <td>{m.vendorName ?? "—"}</td>
                  <td style={{ color: "var(--text-dim)" }}>{m.practiceArea}</td>
                  <td style={{ color: "var(--text-dim)" }}>{geo}</td>
                  <td>{budget > 0 ? fmtK(budget) : "—"}</td>
                  <td style={{ fontWeight: 700 }}>{fmtK(m.spendToDate)}</td>
                  <td style={{ fontWeight: 800, color: overrunColor }}>
                    {budget > 0 ? (overrun >= 0 ? `+${overrun}%` : `${overrun}%`) : "—"}
                  </td>
                  <td><span className={`ml-pill ${cls}`}>{label}</span></td>
                  <td>
                    {(() => {
                      const status = deriveStatus(m.id, getActionTotal(m.id));
                      const { label: txt, tone } = statusLabel(status);
                      const bg = tone === "green" ? "#d6f0d8" : tone === "blue" ? "#dbe7f3" : "#fff3c4";
                      const fg = tone === "green" ? "#1f7a3a" : tone === "blue" ? "#1e5f9c" : "#7a5b00";
                      const bd = tone === "green" ? "#a8d8b8" : tone === "blue" ? "#a7c1da" : "#e3c772";
                      return (
                        <span
                          style={{
                            background: bg,
                            color: fg,
                            border: `1px solid ${bd}`,
                            padding: "2px 8px",
                            borderRadius: 3,
                            fontSize: 10,
                            fontWeight: 700,
                            whiteSpace: "nowrap"
                          }}
                        >
                          {txt}
                        </span>
                      );
                    })()}
                  </td>
                  <td>
                    <button
                      type="button"
                      className="mlink"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/briefing/${m.id}`, { state: { from: "matter-list", level: lvl } });
                      }}
                    >
                      ⚡ View AI Briefing →
                    </button>
                  </td>
                </tr>
              );
            })}
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={11} style={{ textAlign: "center", padding: 20, color: "var(--text-dim)" }}>
                  {error
                    ? "Failed to load matters from Passport."
                    : search
                      ? `No matters match “${search}”.`
                      : "No matters in this category."}
                </td>
              </tr>
            )}
            {loading && (
              <tr>
                <td colSpan={11} style={{ textAlign: "center", padding: 20, color: "var(--text-dim)" }}>
                  Loading matters…
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
