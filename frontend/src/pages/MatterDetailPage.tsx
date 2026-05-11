import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getMatter } from "../services/endpoints";
import type { MatterRiskRecord } from "../types/domain";
import { MatterDetailExtras } from "../features/drilldown/MatterDetailExtras";
import { useBackNav } from "../lib/navigationOrigin";

interface LiveSignal {
  key: string;
  label: string;
  score: number;
  level: "critical" | "watch" | "stable";
  detail: string;
}

interface LiveActivity {
  invoiceNumber: string;
  invoiceDate: string;
  amount: number;
  status: string;
}

interface LiveBriefing {
  signals?: LiveSignal[];
  invoiceQueue?: LiveActivity[];
  budgetTotal?: number;
  spendTotal?: number;
  daysUntilBudgetExhausted?: number;
  invoiceVelocity?: { last14Days: number; portfolioAvg: number };
}

const SIGNAL_AXES: Array<{ key: string; label: string; angle: number }> = [
  { key: "budgetBurn", label: "Budget Burn", angle: -90 },
  { key: "invoiceVelocity", label: "Invoice Velocity", angle: -18 },
  { key: "compliance", label: "Compliance", angle: 54 },
  { key: "timelineRisk", label: "Timeline", angle: 126 },
  { key: "vendorRisk", label: "Vendor Risk", angle: -162 }
];

/** Render the spider chart polygon from live signal scores. Falls back to
 *  a tiny placeholder polygon when the briefing call hasn't returned yet. */
function spiderPath(signals: LiveSignal[] | undefined, cx: number, cy: number, radius: number): string {
  if (!signals?.length) return "";
  return SIGNAL_AXES.map((axis) => {
    const sig = signals.find((s) => s.key === axis.key);
    const score = sig?.score ?? 0;
    const r = (score / 100) * radius;
    const rad = (axis.angle * Math.PI) / 180;
    const x = cx + r * Math.cos(rad);
    const y = cy + r * Math.sin(rad);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
}

function axisLabel(axis: { angle: number }, cx: number, cy: number, radius: number) {
  const rad = (axis.angle * Math.PI) / 180;
  const labelRadius = radius + 14;
  return {
    x: cx + labelRadius * Math.cos(rad),
    y: cy + labelRadius * Math.sin(rad)
  };
}

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);

/** Matter Detail screen — every value (matter header, spider scores,
 *  budget/spend numbers, days-to-zero, recent activity) is hydrated from
 *  Passport via `GET /api/matters/:id` + `GET /api/matters/:id/briefing`. */
export function MatterDetailPage() {
  const { matterId } = useParams<{ matterId: string }>();
  const navigate = useNavigate();
  const { label: backLabel, onBack } = useBackNav("briefing");
  const [matter, setMatter] = useState<MatterRiskRecord | null>(null);
  const [briefing, setBriefing] = useState<LiveBriefing | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!matterId) return;
    let cancelled = false;
    setLoading(true);
    setNotFound(false);

    Promise.all([
      getMatter(matterId).catch((err) => {
        if (err instanceof Error && err.message.includes("404")) setNotFound(true);
        return null;
      }),
      fetch(`/api/matters/${encodeURIComponent(matterId)}/briefing`)
        .then((r) => (r.ok ? r.json() : null))
        .then((p) => p?.data ?? null)
        .catch(() => null)
    ]).then(([m, b]) => {
      if (cancelled) return;
      setMatter(m);
      setBriefing(b);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [matterId]);

  if (loading) {
    return (
      <>
        <div className="scr-chrome">
          <button className="back-btn" type="button" onClick={onBack}>{backLabel}</button>
          <span className="scr-title">Matter Detail — Loading…</span>
        </div>
        <div className="scr-body">
          <div className="bcard"><div className="bcard-body">Loading from Passport…</div></div>
        </div>
      </>
    );
  }

  if (notFound || !matter) {
    return (
      <>
        <div className="scr-chrome">
          <button className="back-btn" type="button" onClick={onBack}>{backLabel}</button>
          <span className="scr-title">Matter Detail — Not Found</span>
        </div>
        <div className="scr-body">
          <div className="bcard">
            <div className="bcard-body">No matter found for id {matterId}.</div>
          </div>
        </div>
      </>
    );
  }

  const budget = briefing?.budgetTotal ?? matter.budgetTotal ?? 0;
  const spend = briefing?.spendTotal ?? matter.spendToDate;
  const overrun = budget > 0 ? Math.round(((spend - budget) / budget) * 100) : 0;
  const remaining = Math.max(0, budget - spend);
  const daysToZero = briefing?.daysUntilBudgetExhausted;
  const velocity = briefing?.invoiceVelocity?.last14Days;
  const signals = briefing?.signals ?? [];
  const overallScore = matter.riskScore;
  const overallLevel = overallScore >= 75 ? "Critical" : overallScore >= 50 ? "Watch" : "Stable";
  const overallTone = overallScore >= 75 ? "var(--red)" : overallScore >= 50 ? "var(--amber)" : "var(--green)";

  // Spider chart geometry
  const cx = 130, cy = 102, R = 60;

  return (
    <>
      <div className="scr-chrome">
        <button className="back-btn" type="button" onClick={onBack}>{backLabel}</button>
        <span className="scr-title">
          Matter Detail — {matter.matterNumber ?? `#${matter.id}`} · {matter.title} · {matter.vendorName ?? "Unassigned"} · {matter.practiceArea}
        </span>
      </div>
      <div className="scr-body">
        <div className="matter-layout">
          <div className="bcard">
            <div className="bcard-hdr">Risk Radar — Multi-Signal Spider View</div>
            <div className="bcard-body">
              <div className="spider-container">
                <svg width="260" height="240" viewBox="0 0 260 240">
                  <defs>
                    <style>{`
                      .spider-grid { fill:none; stroke:#c5d8ea; stroke-width:1; }
                      .spider-axis { stroke:#c5d8ea; stroke-width:1; }
                      .spider-area { fill:rgba(192,57,43,0.15); stroke:#c0392b; stroke-width:2; }
                      .spider-dot  { fill:#c0392b; }
                      .spider-lbl  { font-size:10px; fill:#6b7c8d; font-family:'Segoe UI',Arial,sans-serif; }
                      .spider-val  { font-size:9px; fill:#2c3e50; font-weight:700; font-family:'Segoe UI',Arial,sans-serif; }
                    `}</style>
                  </defs>
                  {/* concentric grid rings at 33%, 66%, 100% */}
                  {[1, 0.66, 0.33].map((scale, idx) => (
                    <polygon
                      key={idx}
                      className="spider-grid"
                      points={SIGNAL_AXES.map((a) => {
                        const rad = (a.angle * Math.PI) / 180;
                        return `${(cx + R * scale * Math.cos(rad)).toFixed(1)},${(cy + R * scale * Math.sin(rad)).toFixed(1)}`;
                      }).join(" ")}
                    />
                  ))}
                  {/* axis spokes */}
                  {SIGNAL_AXES.map((a) => {
                    const rad = (a.angle * Math.PI) / 180;
                    return (
                      <line
                        key={a.key}
                        className="spider-axis"
                        x1={cx} y1={cy}
                        x2={cx + R * Math.cos(rad)}
                        y2={cy + R * Math.sin(rad)}
                      />
                    );
                  })}
                  {/* live signal polygon */}
                  {signals.length > 0 && (
                    <polygon className="spider-area" points={spiderPath(signals, cx, cy, R)} />
                  )}
                  {SIGNAL_AXES.map((axis) => {
                    const sig = signals.find((s) => s.key === axis.key);
                    const score = sig?.score ?? 0;
                    const rad = (axis.angle * Math.PI) / 180;
                    const r = (score / 100) * R;
                    const dotX = cx + r * Math.cos(rad);
                    const dotY = cy + r * Math.sin(rad);
                    const lbl = axisLabel(axis, cx, cy, R);
                    const tone = score >= 75 ? "#c0392b" : score >= 50 ? "#b7770d" : "#2e7d32";
                    return (
                      <g key={axis.key}>
                        {signals.length > 0 && <circle className="spider-dot" cx={dotX} cy={dotY} r={4} />}
                        <text className="spider-lbl" x={lbl.x} y={lbl.y - 4} textAnchor="middle">{axis.label}</text>
                        <text className="spider-val" x={lbl.x} y={lbl.y + 8} textAnchor="middle" fill={tone}>
                          {signals.length > 0 ? `${score}/100` : "—"}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>
              <div className="signal-row">
                <div className="signal-grp">
                  <div className="signal-bars-wrap">
                    {[10, 16, 22, 28, 32].map((h, i) => (
                      <div key={i} className={`sbar${i < Math.ceil(overallScore / 20) ? " on" : ""}`} style={{ height: h }} />
                    ))}
                  </div>
                  <div className="signal-val" style={{ color: overallTone }}>{overallLevel.toUpperCase()}</div>
                  <div className="signal-lbl">Overall Risk</div>
                </div>
                <div className="signal-grp" style={{ marginLeft: 16 }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: overrun > 25 ? "var(--red)" : overrun > 0 ? "var(--amber)" : "var(--green)" }}>
                    {budget > 0 ? `${overrun >= 0 ? "+" : ""}${overrun}%` : "—"}
                  </div>
                  <div className="signal-lbl">Budget Overrun</div>
                </div>
                <div className="signal-grp" style={{ marginLeft: 16 }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: (daysToZero ?? 99) < 30 ? "var(--red)" : "var(--amber)" }}>
                    {daysToZero ?? "—"}
                  </div>
                  <div className="signal-lbl">Days to Budget Zero</div>
                </div>
                <div className="signal-grp" style={{ marginLeft: 16 }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: "var(--amber)" }}>
                    {velocity ?? "—"}
                  </div>
                  <div className="signal-lbl">Invoices / 14 Days</div>
                </div>
              </div>
            </div>
          </div>

          <div className="bcard">
            <div className="bcard-hdr">Matter Details &amp; Activity Log</div>
            <div className="bcard-body">
              <table className="pp-tbl" style={{ marginBottom: 14 }}>
                <tbody>
                  <tr>
                    <td style={{ color: "var(--text-dim)", fontSize: 11 }}>Matter Number</td>
                    <td style={{ fontWeight: 700 }}>{matter.matterNumber ?? `#${matter.id}`}</td>
                  </tr>
                  <tr>
                    <td style={{ color: "var(--text-dim)", fontSize: 11 }}>Matter Name</td>
                    <td>{matter.title}</td>
                  </tr>
                  <tr>
                    <td style={{ color: "var(--text-dim)", fontSize: 11 }}>Organization</td>
                    <td>{matter.vendorName ?? "—"}</td>
                  </tr>
                  <tr>
                    <td style={{ color: "var(--text-dim)", fontSize: 11 }}>Practice Area</td>
                    <td>{matter.practiceArea}</td>
                  </tr>
                  <tr>
                    <td style={{ color: "var(--text-dim)", fontSize: 11 }}>Geography</td>
                    <td>
                      {matter.jurisdictionName
                        ? `${matter.jurisdictionName}${matter.jurisdictionCode ? `, ${matter.jurisdictionCode}` : ""}`
                        : "—"}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ color: "var(--text-dim)", fontSize: 11 }}>Budget</td>
                    <td>{budget > 0 ? fmt(budget) : "—"}</td>
                  </tr>
                  <tr>
                    <td style={{ color: "var(--text-dim)", fontSize: 11 }}>Actual Spend</td>
                    <td style={{ color: overrun > 25 ? "var(--red)" : "var(--amber)", fontWeight: 700 }}>
                      {fmt(spend)}{budget > 0 ? ` (${overrun >= 0 ? "+" : ""}${overrun}%)` : ""}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ color: "var(--text-dim)", fontSize: 11 }}>Remaining Budget</td>
                    <td style={{ color: remaining < budget * 0.1 ? "var(--red)" : "var(--amber)", fontWeight: 700 }}>
                      {budget > 0 ? `${fmt(remaining)} · ${daysToZero ?? "—"} days` : "—"}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ color: "var(--text-dim)", fontSize: 11 }}>Risk Score</td>
                    <td>
                      <span className={`risk-pill ${overallScore >= 75 ? "red" : overallScore >= 50 ? "amber" : "green"}`}>
                        {overallScore >= 75 ? "🔴" : overallScore >= 50 ? "🟡" : "🟢"} {overallScore} / 100 {overallLevel}
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td style={{ color: "var(--text-dim)", fontSize: 11 }}>Last Updated</td>
                    <td>{new Date(matter.updatedAt).toLocaleString()}</td>
                  </tr>
                </tbody>
              </table>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--card-hdr-t)",
                marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.4 }}>
                Recent Activity
              </div>
              {(briefing?.invoiceQueue ?? []).slice(0, 6).map((inv) => (
                <div className="activity-item" key={inv.invoiceNumber}>
                  <div>
                    Invoice #{inv.invoiceNumber} · {fmt(inv.amount)}{" "}
                    <span style={{ color: "var(--text-dim)", fontSize: 10 }}>({inv.status})</span>
                  </div>
                  <div className="activity-date">{new Date(inv.invoiceDate).toLocaleDateString()}</div>
                </div>
              ))}
              {(!briefing?.invoiceQueue || briefing.invoiceQueue.length === 0) && (
                <div className="activity-item" style={{ color: "var(--text-dim)" }}>
                  No recent invoice activity in Passport for this matter.
                </div>
              )}
              <div style={{ marginTop: 12 }}>
                <button type="button" className="mlink" onClick={() => navigate(`/briefing/${matter.id}`, { state: { from: "briefing" } })}>
                  ⚡ View AI Briefing &amp; Recommended Actions →
                </button>
              </div>
            </div>
          </div>
        </div>

        <MatterDetailExtras matter={matter} />
      </div>
    </>
  );
}
