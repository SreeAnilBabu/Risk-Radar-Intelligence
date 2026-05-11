import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { PassportMatter, PassportLevel } from "../data/passportSeed";
import { pct } from "../data/passportSeed";
import { computeSignals, type SignalBundle, type SignalScore } from "../lib/riskSignals";
import { getRecommendedActions } from "../lib/recommendedActions";
import { ROLE_LABELS, useUserRole, type UserRole } from "../lib/userRole";
import { RiskSignalBars } from "../features/briefing/RiskSignalBars";
import { RecommendedActionsCard } from "../features/briefing/RecommendedActionsCard";
import { InvoiceQueue } from "../features/briefing/InvoiceQueue";
import { SmartAIBriefing } from "../features/briefing/SmartAIBriefing";
import { getMatter, listMatters } from "../services/endpoints";
import type { MatterRiskRecord } from "../types/domain";
import { useBackNav } from "../lib/navigationOrigin";

/** Adapter — convert a live `MatterRiskRecord` into the legacy seed-shaped
 *  `PassportMatter` so existing helpers (computeSignals, RecommendedActions,
 *  InvoiceQueue) keep working without rewriting them. */
function toLegacyMatter(rec: MatterRiskRecord, budgetTotal?: number): PassportMatter {
  const level: PassportLevel = rec.riskScore >= 75 ? "critical" : rec.riskScore >= 50 ? "warning" : "healthy";
  const budget = budgetTotal ?? rec.budgetTotal ?? Math.max(rec.spendToDate, 1);
  return {
    id: rec.matterNumber ?? rec.id,
    name: rec.title,
    firm: rec.vendorName ?? "Outside counsel",
    type: rec.practiceArea,
    lat: 0,
    lng: 0,
    budget,
    actual: rec.spendToDate,
    level
  };
}

interface LiveBriefing {
  signals?: SignalScore[];
  invoiceQueue?: Array<{
    invoiceNumber: string;
    invoiceDate: string;
    amount: number;
    status: string;
    hasErrors: boolean;
    isVoided: boolean;
  }>;
  budgetTotal?: number;
  spendTotal?: number;
  daysUntilBudgetExhausted?: number;
  invoiceVelocity?: { last14Days: number; portfolioAvg: number };
}

/** AI Briefing screen — mirrors screen2 of the reference HTML. */
export function BriefingPage() {
  const { matterId } = useParams<{ matterId: string }>();
  const navigate = useNavigate();
  const { label: backLabel, onBack } = useBackNav("matter-list");
  const [role, setRole] = useUserRole();
  const [live, setLive] = useState<LiveBriefing | null>(null);
  const [liveMatter, setLiveMatter] = useState<MatterRiskRecord | null>(null);
  const [relatedLive, setRelatedLive] = useState<MatterRiskRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch the matter record itself (live from Passport).
  useEffect(() => {
    if (!matterId) return;
    let cancelled = false;
    setLoading(true);
    getMatter(matterId)
      .then((m) => {
        if (!cancelled) setLiveMatter(m);
      })
      .catch(() => {
        if (!cancelled) setLiveMatter(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [matterId]);

  // Synthetic seed-shaped matter so existing helpers keep working.
  const matter: PassportMatter | undefined = useMemo(
    () => (liveMatter ? toLegacyMatter(liveMatter, live?.budgetTotal) : undefined),
    [liveMatter, live?.budgetTotal]
  );

  // Fetch the live briefing payload from the backend. Falls back silently to
  // seed-derived signals when the API is unavailable so the demo still works
  // when the backend isn't running.
  useEffect(() => {
    if (!matterId) return;
    let cancelled = false;
    fetch(`/api/matters/${encodeURIComponent(matterId)}/briefing`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((payload) => {
        if (!cancelled) setLive(payload?.data ?? null);
      })
      .catch(() => {
        if (!cancelled) setLive(null);
      });
    return () => {
      cancelled = true;
    };
  }, [matterId]);

  // Fetch a few related matters from the same vendor (cheap server query).
  useEffect(() => {
    if (!liveMatter) return;
    let cancelled = false;
    listMatters({ level: "critical", size: 5 })
      .then((rows) => {
        if (cancelled) return;
        const sameVendor = rows.filter(
          (r) => r.id !== liveMatter.id && r.vendorName && r.vendorName === liveMatter.vendorName
        );
        const fallback = rows.filter((r) => r.id !== liveMatter.id).slice(0, 3);
        setRelatedLive(sameVendor.length > 0 ? sameVendor.slice(0, 3) : fallback);
      })
      .catch(() => setRelatedLive([]));
    return () => {
      cancelled = true;
    };
  }, [liveMatter]);

  // Compute the five canonical risk signals for this matter (seed fallback).
  const seedBundle = useMemo(
    () => (matter ? computeSignals(matter) : null),
    [matter]
  );

  // Bundle that the UI actually consumes — prefers server-computed signals
  // when available, otherwise falls back to the seed-derived bundle.
  const bundle: SignalBundle | null = useMemo(() => {
    if (!seedBundle) return null;
    if (!live?.signals || live.signals.length === 0) return seedBundle;
    const overall = Math.round(
      live.signals.reduce((s, sig) => s + sig.score, 0) / live.signals.length
    );
    return {
      ...seedBundle,
      signals: live.signals,
      overall,
      invoiceLast14: live.invoiceVelocity?.last14Days ?? seedBundle.invoiceLast14,
      portfolioAvg: live.invoiceVelocity?.portfolioAvg ?? seedBundle.portfolioAvg,
      daysUntilExhausted: live.daysUntilBudgetExhausted ?? seedBundle.daysUntilExhausted
    };
  }, [seedBundle, live]);

  const actionPlan = useMemo(
    () => (matter && bundle ? getRecommendedActions(matter, bundle, role) : null),
    [matter, bundle, role]
  );

  // Related matters table — pulled live from `/api/matters` (same vendor when available).
  const related = relatedLive;

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);

  return (
    <>
      <div className="scr-chrome" style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <button className="back-btn" type="button" onClick={onBack}>
          {backLabel}
        </button>
        <span className="scr-title" style={{ flex: "1 1 240px", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          Risk Intelligence — AI Briefing: {matter ? matter.name : "Selected Cluster"}
          {liveMatter?.matterNumber && (
            <span style={{
              marginLeft: 8, fontSize: 11, fontWeight: 700, letterSpacing: 0.4,
              padding: "2px 8px", borderRadius: 10,
              background: "rgba(0,0,0,0.18)", color: "#dbe7f3"
            }}>{liveMatter.matterNumber}</span>
          )}
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 8, flex: "0 0 auto" }}>
          <label htmlFor="role-switch" style={{ fontSize: 12, color: "#dbe7f3" }}>
            Viewing as
          </label>
          <select
            id="role-switch"
            className="role-switch"
            value={role}
            onChange={(e) => setRole(e.target.value as UserRole)}
          >
            {(Object.keys(ROLE_LABELS) as UserRole[]).map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </select>
        </span>
      </div>
      <div className="scr-body">
        {matterId && <SmartAIBriefing matterId={matterId} />}

        {bundle && (
          <div className="bcard">
            <div className="bcard-hdr">
              Risk Signals — {matter?.type} Cluster
            </div>
            <div className="bcard-body">
              <RiskSignalBars
                bundle={bundle}
                contextLine={`Cluster average across ${bundle.cluster.length} matter${bundle.cluster.length === 1 ? "" : "s"} · ${matter?.firm ?? ""}`}
              />
            </div>
          </div>
        )}

        {matter && bundle && (
          <div className="bcard">
            <div className="bcard-hdr">Invoice Queue — Pending Approval</div>
            <div className="bcard-body">
              <InvoiceQueue
                matter={matter}
                bundle={bundle}
                live={
                  live
                    ? {
                        invoices: live.invoiceQueue,
                        budgetTotal: live.budgetTotal,
                        spendTotal: live.spendTotal,
                        daysUntilBudgetExhausted: live.daysUntilBudgetExhausted
                      }
                    : undefined
                }
              />
            </div>
          </div>
        )}

        {actionPlan && <RecommendedActionsCard plan={actionPlan} role={role} />}

        <div className="bcard">
          <div className="bcard-hdr">Affected Matters — {matter?.firm ?? "Wilson LLP"} Cluster</div>
          <div className="bcard-body" style={{ padding: 0 }}>
            <table className="pp-tbl">
              <thead>
                <tr>
                  <th>Matter ID</th>
                  <th>Matter Name</th>
                  <th>Organization</th>
                  <th>Type</th>
                  <th>Budget</th>
                  <th>Actual Spend</th>
                  <th>Overrun</th>
                </tr>
              </thead>
              <tbody>
                {related.map((m) => {
                  const budget = m.budgetTotal ?? 0;
                  const overrun = budget > 0 ? Math.round(((m.spendToDate - budget) / budget) * 100) : 0;
                  const tone = overrun >= 25 ? "red" : overrun > 0 ? "amber" : "green";
                  return (
                    <tr key={m.id}>
                      <td>
                        <button type="button" className="mlink" onClick={() => navigate(`/matter/${m.id}`, { state: { from: "briefing" } })}>
                          {m.matterNumber ?? `#${m.id}`}
                        </button>
                      </td>
                      <td>{m.title}</td>
                      <td>{m.vendorName ?? "—"}</td>
                      <td>{m.practiceArea}</td>
                      <td>{budget > 0 ? fmt(budget) : "—"}</td>
                      <td style={{ color: `var(--${tone})`, fontWeight: 700 }}>{fmt(m.spendToDate)}</td>
                      <td>
                        <span className={`risk-pill ${tone}`}>
                          {budget > 0
                            ? `${tone === "red" ? "🔴" : tone === "amber" ? "🟡" : "🟢"} ${overrun >= 0 ? "+" : ""}${overrun}%`
                            : "—"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {related.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ textAlign: "center", padding: 14, color: "var(--text-dim)" }}>
                      No related matters found in Passport.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
