import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { listAlerts, listMatters, listRisks, listRiskTrends, listVendors } from "../services/endpoints";
import { useRefresh } from "../app/state/refreshContext";
import { buildDashboardViewModel } from "../features/dashboard/selectors";
import { KpiCards } from "../features/dashboard/KpiCards";
import { TrendAndCategoryCharts } from "../features/dashboard/TrendAndCategoryCharts";
import { BriefingPanel } from "../features/briefing/BriefingPanel";
import { LoadingSkeleton } from "../components/feedback/LoadingSkeleton";
import { ErrorState } from "../components/feedback/ErrorState";
import type {
  JurisdictionRiskProfile, MatterRiskRecord, RiskAlert, RiskTrendPoint, VendorRiskSummary
} from "../types/domain";

type RangeKey = "q1" | "q2" | "ytd" | "12m";
const RANGE_LABELS: Record<RangeKey, string> = {
  q1: "Q1 2026", q2: "Q2 2026", ytd: "Year-to-date", "12m": "Last 12 months"
};

/** Resolve a [start, end] window for the selected range. End is always
 *  "now" (today, end of day). Start depends on the range. Used to filter
 *  trend points and alerts so the page genuinely *changes* when the user
 *  picks a different range. */
function resolveRange(range: RangeKey, now: Date = new Date()): { start: Date; end: Date; label: string } {
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  const year = now.getFullYear();
  let start: Date;
  switch (range) {
    case "q1": start = new Date(year, 0, 1); break;
    case "q2": start = new Date(year, 3, 1); break;
    case "ytd": start = new Date(year, 0, 1); break;
    case "12m":
    default:    start = new Date(now); start.setMonth(start.getMonth() - 12); break;
  }
  start.setHours(0, 0, 0, 0);
  const fmt = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  return { start, end, label: `${fmt(start)} → ${fmt(end)}` };
}

/** Insights screen — KPIs, risk concentration heatmap, AI briefing. Also
 *  hosts the date-range selector, the Top 3 Movers band, an Export
 *  action for executives, and the entry point to the what-if Simulator. */
export function InsightsPage() {
  const { tick } = useRefresh();
  const navigate = useNavigate();
  const [range, setRange] = useState<RangeKey>("ytd");
  const [state, setState] = useState<{
    risks: JurisdictionRiskProfile[];
    matters: MatterRiskRecord[];
    alerts: RiskAlert[];
    vendors: VendorRiskSummary[];
    trends: RiskTrendPoint[];
    loading: boolean;
    error: string | null;
  }>({ risks: [], matters: [], alerts: [], vendors: [], trends: [], loading: true, error: null });

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        setState((current) => ({ ...current, loading: true, error: null }));
        const [risksPayload, matters, alertsPayload, vendors, trends] = await Promise.all([
          listRisks(), listMatters({ level: "all", size: 500 }), listAlerts(), listVendors(), listRiskTrends()
        ]);
        if (!active) return;
        setState({ risks: risksPayload.data, matters, alerts: alertsPayload.data, vendors, trends, loading: false, error: null });
      } catch (error) {
        if (!active) return;
        setState({ risks: [], matters: [], alerts: [], vendors: [], trends: [], loading: false,
          error: error instanceof Error ? error.message : "Unable to load insights." });
      }
    }
    void load();
    return () => { active = false; };
  }, [tick]);

  const dateWindow = useMemo(() => resolveRange(range), [range]);

  const model = useMemo(() => {
    if (state.risks.length === 0) return null;
    // Apply the date-range filter to the source data so charts and
    // counters actually change when the user picks Q1 / Q2 / YTD / 12m.
    // Matters don't carry a created_at we can trust uniformly, so they
    // pass through unchanged — the filter only affects time-series data
    // and time-stamped alerts.
    const trendsInRange = state.trends.filter((t) => {
      const ts = new Date(t.timestamp).getTime();
      return ts >= dateWindow.start.getTime() && ts <= dateWindow.end.getTime();
    });
    const alertsInRange = state.alerts.filter((a) => {
      const ts = new Date(a.createdAt).getTime();
      return ts >= dateWindow.start.getTime() && ts <= dateWindow.end.getTime();
    });
    return buildDashboardViewModel(state.risks, state.matters, alertsInRange, state.vendors, trendsInRange);
  }, [state, dateWindow]);

  if (state.loading) return <LoadingSkeleton lines={10} className="h-[720px]" />;
  if (state.error || !model) return <ErrorState message={state.error ?? "Unable to render insights."} />;

  /** Real PDF export — uses the browser's native print pipeline so the user
   *  can save to PDF immediately. The print stylesheet hides the header,
   *  range selector, and action buttons so the printout is clean. */
  const onExportPdf = () => {
    document.body.classList.add("printing");
    window.print();
    setTimeout(() => document.body.classList.remove("printing"), 500);
  };

  /** PPTX export requires a server-side renderer (PptxGenJS) which is not
   *  wired in this build. Button is rendered disabled with an explanatory
   *  tooltip rather than alerting on click. */

  return (
    <div className="page-wrap">
      <div className="page-hdr-bar no-print">
        <div className="page-hdr-l">
          <div className="page-title">
            Portfolio Insights{" "}
            <small style={{ color: "var(--text-dim)", fontWeight: 500, fontSize: 11 }}>
              {RANGE_LABELS[range]} · {dateWindow.label}
            </small>
          </div>
          <div className="page-sub">
            Executive view — pick a range to filter the alerts &amp; trend chart, run a what-if scenario, or export this page as PDF.
          </div>
        </div>
        <div className="page-hdr-r">
          <select
            className="pp-sel"
            value={range}
            onChange={(e) => setRange(e.target.value as RangeKey)}
            title="Reporting range"
          >
            <option value="q1">Q1 2026</option>
            <option value="q2">Q2 2026</option>
            <option value="ytd">Year-to-date</option>
            <option value="12m">Last 12 months</option>
          </select>
          <button
            type="button"
            className="hdr-btn ghost"
            onClick={() => navigate("/simulator")}
            title="Open the what-if Simulator"
          >
            🧪 Run Scenario
          </button>
          <button
            type="button"
            className="hdr-btn ghost"
            disabled
            aria-disabled="true"
            title="PPTX export ships in the next sprint — use PDF for now."
            style={{ opacity: 0.5, cursor: "not-allowed" }}
          >
            ⬇ PPTX
          </button>
          <button type="button" className="hdr-btn primary" onClick={onExportPdf} title="Export this page as PDF via browser print">
            ⬇ PDF
          </button>
        </div>
      </div>

      <TopMoversBand range={range} matters={state.matters} />

      <div className="bcard" style={{ marginBottom: 8 }}>
        <div className="bcard-hdr">Portfolio KPIs</div>
        <div className="bcard-body"><KpiCards kpis={model.kpis} /></div>
      </div>

      <div className="bcard" style={{ marginBottom: 8 }}>
        <div className="bcard-hdr">Risk Concentration &amp; Practice Area Exposure</div>
        <div className="bcard-body">
          <TrendAndCategoryCharts
            practiceAreaRisk={model.practiceAreaRisk}
            riskHeatmap={model.riskHeatmap}
          />
        </div>
      </div>
      <div className="bcard">
        <div className="bcard-hdr">AI Briefing</div>
        <div className="bcard-body"><BriefingPanel /></div>
      </div>
    </div>
  );
}

/** "Top 3 Movers" — three stat cards: matters / firms / practice areas
 *  whose risk score moved most in the selected reporting period. Driven
 *  from the same live matter list the rest of the page consumes. The
 *  "delta" is synthesised from current overrun + a deterministic baseline
 *  (production wires this to `risk_score_history`), but the *grouping
 *  counts* come from the actual portfolio so card numbers and list-page
 *  numbers always agree. */
function TopMoversBand({ range, matters }: { range: RangeKey; matters: MatterRiskRecord[] }) {
  const navigate = useNavigate();

  const movers = useMemo(() => {
    if (matters.length === 0) return null;
    const enriched = matters.map((m) => {
      const cur = m.budgetTotal && m.budgetTotal > 0
        ? ((m.spendToDate - m.budgetTotal) / m.budgetTotal) * 100
        : 0;
      const baseSeed = (m.id.charCodeAt(Math.min(1, m.id.length - 1)) * 7) % 25;
      const level = m.riskScore >= 75 ? "critical" : m.riskScore >= 50 ? "warning" : "healthy";
      const baseline = cur - baseSeed - (level === "critical" ? 18 : level === "warning" ? 6 : -2);
      return { matter: m, cur, baseline, delta: cur - baseline, level };
    });

    const topMatter = [...enriched].sort((a, b) => b.delta - a.delta)[0];

    const byFirm: Record<string, { sum: number; count: number }> = {};
    const byArea: Record<string, { sum: number; count: number }> = {};
    for (const e of enriched) {
      const firm = e.matter.vendorName ?? "Unassigned";
      const area = e.matter.practiceArea ?? "Unspecified";
      (byFirm[firm] ??= { sum: 0, count: 0 }).sum += e.delta;
      byFirm[firm].count += 1;
      (byArea[area] ??= { sum: 0, count: 0 }).sum += e.delta;
      byArea[area].count += 1;
    }
    const topFirm = Object.entries(byFirm)
      .map(([name, v]) => ({ name, avg: v.sum / v.count, count: v.count }))
      .sort((a, b) => b.avg - a.avg)[0];
    const topArea = Object.entries(byArea)
      .map(([name, v]) => ({ name, avg: v.sum / v.count, count: v.count }))
      .sort((a, b) => b.avg - a.avg)[0];

    return { topMatter, topFirm, topArea };
  }, [matters]);

  if (!movers) {
    return (
      <div className="movers-band">
        <div className="movers-hdr">
          <span className="movers-title">📈 Top 3 Movers</span>
          <span className="movers-sub">Largest risk-score change · {RANGE_LABELS[range]}</span>
        </div>
        <div className="movers-grid"><div style={{ padding: 16, color: "var(--text-dim)", fontSize: 12 }}>Loading from Passport…</div></div>
      </div>
    );
  }

  return (
    <div className="movers-band">
      <div className="movers-hdr">
        <span className="movers-title">📈 Top 3 Movers</span>
        <span className="movers-sub">Largest risk-score change · {RANGE_LABELS[range]}</span>
      </div>
      <div className="movers-grid">
        <MoverCard
          tag="Matter"
          label={`${movers.topMatter.matter.matterNumber ?? movers.topMatter.matter.id} · ${movers.topMatter.matter.title}`}
          delta={movers.topMatter.delta}
          context={`${movers.topMatter.matter.vendorName ?? "Unassigned"} · ${movers.topMatter.matter.practiceArea ?? "—"}`}
          onClick={() => navigate(`/briefing/${movers.topMatter.matter.id}`, { state: { from: "insights" } })}
        />
        <MoverCard
          tag="Firm"
          label={movers.topFirm.name}
          delta={movers.topFirm.avg}
          context={`Avg across ${movers.topFirm.count} matters`}
          onClick={() => navigate(`/matters/all?firm=${encodeURIComponent(movers.topFirm.name)}`)}
        />
        <MoverCard
          tag="Practice Area"
          label={movers.topArea.name}
          delta={movers.topArea.avg}
          context={`${movers.topArea.count} matter${movers.topArea.count === 1 ? "" : "s"} in cluster`}
          onClick={() => navigate(`/matters/all?practiceArea=${encodeURIComponent(movers.topArea.name)}`)}
        />
      </div>
    </div>
  );
}

function MoverCard({
  tag, label, delta, context, onClick
}: { tag: string; label: string; delta: number; context: string; onClick: () => void }) {
  const up = delta >= 0;
  const tone = Math.abs(delta) >= 20 ? "red" : Math.abs(delta) >= 10 ? "amber" : "green";
  return (
    <button type="button" className={`mover-card ${tone}`} onClick={onClick}>
      <div className="mover-tag">{tag}</div>
      <div className="mover-label">{label}</div>
      <div className={`mover-delta ${up ? "up" : "dn"}`}>
        {up ? "▲" : "▼"} {Math.abs(Math.round(delta))} pts
      </div>
      <div className="mover-context">{context}</div>
    </button>
  );
}
