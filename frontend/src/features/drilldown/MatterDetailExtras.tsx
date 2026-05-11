/**
 * MatterDetailExtras.tsx — Budget History card, Activity Timeline card,
 * Recommended Actions card, and Open-in-Passport deep-link button for the
 * Matter Detail page. Implements FR-025, FR-026, FR-027, FR-028, FR-029.
 *
 * All data is fetched from the backend on mount (`/api/matters/:id/budget-history`
 * and `/api/matters/:id/timeline`). Recommended Actions are derived locally
 * by `buildRecommendedActions` so the rules engine can react to the matter
 * + history + timeline together without an extra round-trip. Checkbox
 * completion state lives in component state only — never persisted.
 */
import { useEffect, useMemo, useState } from "react";
import { getMatterBudgetHistory, getMatterTimeline } from "../../services/endpoints";
import type {
  MatterActivityEvent,
  MatterBudgetHistory,
  MatterRiskRecord
} from "../../types/domain";
import { buildRecommendedActions } from "../../lib/matterRecommendedActions";
import { getCompletedMap, setCompletedMap } from "../../lib/matterActionStatus";

interface Props {
  matter: MatterRiskRecord;
}

/** Default placeholder used when VITE_PASSPORT_BASE_URL is not configured.
 *  Keeps the Open-in-Passport link from crashing the demo (CL-006). */
const PASSPORT_PLACEHOLDER = "https://passport.example.com";

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

function buildPassportUrl(matterId: string): string {
  const base = (import.meta.env.VITE_PASSPORT_BASE_URL as string | undefined) ?? PASSPORT_PLACEHOLDER;
  return `${base.replace(/\/+$/, "")}/matter/${encodeURIComponent(matterId)}/budget`;
}

const SEVERITY_DOT: Record<MatterActivityEvent["severity"], string> = {
  critical: "var(--red)",
  warn: "var(--amber)",
  info: "var(--green)"
};

const RISK_TONE: Record<MatterBudgetHistory["reallocationRiskLevel"], string> = {
  high: "var(--red)",
  medium: "var(--amber)",
  low: "var(--green)"
};

export function MatterDetailExtras({ matter }: Props) {
  const [history, setHistory] = useState<MatterBudgetHistory | null>(null);
  const [hasHistory, setHasHistory] = useState<boolean>(false);
  const [timeline, setTimeline] = useState<MatterActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [completed, setCompleted] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      getMatterBudgetHistory(matter.id).catch(() => ({ data: null, hasHistory: false })),
      getMatterTimeline(matter.id).catch(() => [])
    ]).then(([bh, tl]) => {
      if (cancelled) return;
      setHistory(bh.data ?? null);
      setHasHistory(Boolean((bh as { hasHistory?: boolean }).hasHistory));
      setTimeline(Array.isArray(tl) ? tl : []);
      setLoading(false);
      // Restore previously saved checkbox state for this matter (CL-010 —
      // local-only). If nothing is saved we render a clean checklist.
      setCompleted(getCompletedMap(matter.id));
    });
    return () => {
      cancelled = true;
    };
  }, [matter.id]);

  const pendingInvoiceCount = useMemo(
    () => timeline.filter((e) => e.type === "invoice_submitted").length,
    [timeline]
  );

  const actions = useMemo(
    () => buildRecommendedActions({ matter, budgetHistory: history, timeline, pendingInvoiceCount }),
    [matter, history, timeline, pendingInvoiceCount]
  );

  const passportUrl = buildPassportUrl(matter.id);
  const matterLabel = matter.matterNumber ?? `#${matter.id}`;

  return (
    <>
      {/* ── Budget History card (FR-026 / FR-027) ────────────────────── */}
      <div className="bcard" style={{ marginTop: 10 }}>
        <div className="bcard-hdr">📅 Budget History — Matter {matterLabel}{matter.title ? ` · ${matter.title}` : ""}</div>
        <div className="bcard-body">
          {loading && <div style={{ color: "var(--text-dim)" }}>Loading budget history…</div>}
          {!loading && !hasHistory && (
            <div style={{ color: "var(--text-dim)", fontSize: 12 }}>
              No budget revisions yet for this matter. Revisions appear here once approved in Passport.
            </div>
          )}
          {!loading && history && (
            <>
              <table className="pp-tbl" style={{ marginBottom: 12 }}>
                <thead>
                  <tr>
                    <th>Revision</th>
                    <th>Date</th>
                    <th>Change</th>
                    <th>Running Total</th>
                    <th>Reason</th>
                    <th>Approved By</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    let running = 0;
                    return history.revisions.map((rev) => {
                      running = rev.status === "original" ? rev.amount : running + rev.delta;
                      const isIncrease = rev.delta > 0;
                      const isDecrease = rev.delta < 0;
                      const isOriginal = rev.delta === 0;
                      const changeColor = isIncrease ? "var(--red)" : isDecrease ? "var(--green)" : "var(--text-dim)";
                      const arrow = isIncrease ? "▲" : isDecrease ? "▼" : "●";
                      const changeLabel = isOriginal ? "Initial" : `${isIncrease ? "+" : ""}${fmt(rev.delta)}`;
                      return (
                        <tr key={rev.id}>
                          <td style={{ fontWeight: 700, color: isOriginal ? "var(--text)" : "var(--amber)" }}>
                            {rev.label}
                          </td>
                          <td>{fmtDate(rev.date)}</td>
                          <td>
                            <span
                              style={{
                                display: "inline-flex", alignItems: "center", gap: 4,
                                padding: "2px 8px", borderRadius: 10, fontWeight: 700,
                                fontSize: 11, color: changeColor,
                                background: isIncrease ? "rgba(239,68,68,0.10)" : isDecrease ? "rgba(16,185,129,0.12)" : "rgba(100,116,139,0.10)",
                                border: `1px solid ${isIncrease ? "rgba(239,68,68,0.35)" : isDecrease ? "rgba(16,185,129,0.35)" : "rgba(100,116,139,0.30)"}`
                              }}
                              title={isIncrease ? "Budget increased" : isDecrease ? "Budget decreased" : "Original approved budget"}
                            >
                              <span style={{ fontSize: 9 }}>{arrow}</span>
                              {changeLabel}
                            </span>
                          </td>
                          <td style={{ fontWeight: 700 }}>{fmt(running)}</td>
                          <td>{rev.reason}</td>
                          <td>{rev.approvedBy}</td>
                        </tr>
                      );
                    });
                  })()}
                  <tr>
                    <td style={{ fontWeight: 700, color: "var(--nav-active)" }}>CURRENT</td>
                    <td>{fmtDate(history.revisions[history.revisions.length - 1]?.date ?? new Date().toISOString())}</td>
                    <td style={{ color: "var(--text-dim)", fontStyle: "italic", fontSize: 11 }}>
                      {(() => {
                        const original = history.revisions.find((r) => r.status === "original")?.amount ?? 0;
                        const net = history.currentApprovedTotal - original;
                        if (net === 0) return "Unchanged from original";
                        const pct = original > 0 ? Math.round((net / original) * 100) : 0;
                        return `Net ${net > 0 ? "+" : ""}${fmt(net)} (${net > 0 ? "+" : ""}${pct}% vs original)`;
                      })()}
                    </td>
                    <td style={{ fontWeight: 700, color: "var(--nav-active)" }}>
                      {fmt(history.currentApprovedTotal)} approved
                    </td>
                    <td>{fmt(history.remainingAtCurrentBurn)} remaining at current burn</td>
                    <td style={{ color: "var(--green)" }}>Active</td>
                  </tr>
                </tbody>
              </table>

              <div style={{ display: "grid", gridTemplateColumns: history.advisoryNote ? "1fr 1fr" : "1fr", gap: 10 }}>
                <div
                  style={{
                    padding: "10px 12px",
                    background: "var(--red-bg)",
                    border: "1px solid #f0c4c2",
                    borderRadius: 3
                  }}
                >
                  <div style={{ fontWeight: 700, color: RISK_TONE[history.reallocationRiskLevel], marginBottom: 4 }}>
                    {history.reallocationRiskLevel === "high" ? "🔴" : history.reallocationRiskLevel === "medium" ? "🟡" : "🟢"} Reallocation Risk
                  </div>
                  <div style={{ fontSize: 12 }}>{history.reallocationRiskNote}</div>
                </div>
                {history.advisoryNote && (
                  <div
                    style={{
                      padding: "10px 12px",
                      background: "#eef4fb",
                      border: "1px solid #c5d8ea",
                      borderRadius: 3
                    }}
                  >
                    <div style={{ fontWeight: 700, color: "var(--nav-active)", marginBottom: 4 }}>💡 Advisory</div>
                    <div style={{ fontSize: 12 }}>{history.advisoryNote}</div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Recommended Actions (FR-029) ─────────────────────────────── */}
      <div className="bcard" style={{ marginTop: 10 }}>
        <div className="bcard-hdr">RECOMMENDED ACTIONS — MATTER {matterLabel}</div>
        <div className="bcard-body">
          <div style={{ fontSize: 11, color: "var(--text-dim)", fontStyle: "italic", marginBottom: 8 }}>
            Actions ordered by priority — check each as completed
          </div>
          {actions.map((a) => {
            const checked = completed[a.id] === true;
            return (
              <label
                key={a.id}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 8,
                  padding: "8px 4px",
                  borderBottom: "1px solid #edf2f7",
                  cursor: "pointer",
                  fontSize: 12,
                  textDecoration: checked ? "line-through" : "none",
                  color: checked ? "var(--text-dim)" : "var(--text)"
                }}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => {
                    setCompleted((prev) => {
                      const next = { ...prev, [a.id]: e.target.checked };
                      setCompletedMap(matter.id, next);
                      return next;
                    });
                  }}
                  style={{ marginTop: 3 }}
                />
                <span>
                  <strong style={{ color: "var(--amber)", marginRight: 6 }}>{a.priority}.</strong>
                  {a.text}
                </span>
              </label>
            );
          })}
          <a
            href={passportUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "block",
              marginTop: 14,
              padding: "10px 14px",
              background: "var(--nav-active)",
              color: "#fff",
              textAlign: "center",
              fontWeight: 700,
              fontSize: 13,
              borderRadius: 3,
              textDecoration: "none"
            }}
          >
            🔗 Open Matter {matterLabel} in Passport — Budget Tab →
          </a>
        </div>
      </div>

      {/* ── Activity Timeline (FR-028 / CL-009) ──────────────────────── */}
      <div className="bcard" style={{ marginTop: 10 }}>
        <div className="bcard-hdr">⏱ ACTIVITY TIMELINE — MATTER {matterLabel}</div>
        <div className="bcard-body">
          {loading && <div style={{ color: "var(--text-dim)" }}>Loading timeline…</div>}
          {!loading && timeline.length === 0 && (
            <div style={{ color: "var(--text-dim)", fontSize: 12 }}>No activity recorded for this matter yet.</div>
          )}
          {!loading && timeline.length > 0 && (
            <div style={{ position: "relative", paddingLeft: 18 }}>
              {timeline.map((ev) => (
                <div
                  key={ev.id}
                  style={{ position: "relative", padding: "6px 0 14px 16px", borderLeft: "1px solid #d4dee9" }}
                >
                  <span
                    style={{
                      position: "absolute",
                      left: -7,
                      top: 8,
                      width: 12,
                      height: 12,
                      borderRadius: "50%",
                      background: "#fff",
                      border: `2px solid ${SEVERITY_DOT[ev.severity]}`
                    }}
                  />
                  <div style={{ fontSize: 10, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: 0.4 }}>
                    {fmtDate(ev.occurredAt)}
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 700, marginTop: 2 }}>{ev.title}</div>
                  <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 2 }}>{ev.detail}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
