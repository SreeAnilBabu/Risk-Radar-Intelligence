import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Widget } from "./Widget";
import { listMatters } from "../../services/endpoints";
import type { MatterRiskRecord } from "../../types/domain";

type Tone = "red" | "amber" | "green" | "blue";

const fmtPct = (n: number) => `${n >= 0 ? "+" : ""}${n}%`;
const fmtMoney = (n: number) => {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000)}K`;
  return `$${n}`;
};

interface QuickStats {
  highestOverrun: { matter: MatterRiskRecord; overrun: number } | null;
  largestExposure: MatterRiskRecord | null;
  topRiskFirm: { name: string; criticalCount: number; firstMatterId: string } | null;
}

/** QuickInsights widget — surfaces the four most-actionable signals from the
 *  live critical-matter feed. Each tile deep-links to the matter's briefing. */
export function QuickInsightsWidget() {
  const nav = useNavigate();
  const [stats, setStats] = useState<QuickStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    listMatters({ level: "critical", size: 100 })
      .then((rows) => {
        if (cancelled) return;
        if (rows.length === 0) {
          setStats({ highestOverrun: null, largestExposure: null, topRiskFirm: null });
          return;
        }
        let highest: { matter: MatterRiskRecord; overrun: number } | null = null;
        for (const r of rows) {
          const b = r.budgetTotal ?? 0;
          if (b <= 0) continue;
          const overrun = Math.round(((r.spendToDate - b) / b) * 100);
          if (!highest || overrun > highest.overrun) highest = { matter: r, overrun };
        }
        const largestExposure = [...rows].sort((a, b) => b.spendToDate - a.spendToDate)[0] ?? null;
        const firmCount = new Map<string, { count: number; firstId: string }>();
        for (const r of rows) {
          const firm = r.vendorName;
          if (!firm) continue;
          const cur = firmCount.get(firm) ?? { count: 0, firstId: r.id };
          cur.count++;
          firmCount.set(firm, cur);
        }
        const topRiskFirm = [...firmCount.entries()]
          .sort((a, b) => b[1].count - a[1].count)
          .map(([name, info]) => ({ name, criticalCount: info.count, firstMatterId: info.firstId }))[0] ?? null;

        setStats({ highestOverrun: highest, largestExposure, topRiskFirm });
      })
      .catch(() => {
        if (!cancelled) setStats({ highestOverrun: null, largestExposure: null, topRiskFirm: null });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Widget id="quickInsights" title="Quick Insights">
      {loading || !stats ? (
        <Item title="Loading…" value="—" tone="blue" sub="Live from Passport" />
      ) : (
        <>
          <Item
            title="Highest Overrun"
            value={stats.highestOverrun ? fmtPct(stats.highestOverrun.overrun) : "—"}
            tone="red"
            sub={
              stats.highestOverrun
                ? `${stats.highestOverrun.matter.matterNumber ?? stats.highestOverrun.matter.id} — ${stats.highestOverrun.matter.title}`
                : "No critical matters"
            }
            onClick={() => stats.highestOverrun && nav(`/briefing/${stats.highestOverrun.matter.id}`)}
          />
          <Item
            title="Largest Exposure"
            value={stats.largestExposure ? fmtMoney(stats.largestExposure.spendToDate) : "—"}
            tone="blue"
            sub={
              stats.largestExposure
                ? `${stats.largestExposure.matterNumber ?? stats.largestExposure.id} — ${stats.largestExposure.title}`
                : "—"
            }
            onClick={() => stats.largestExposure && nav(`/briefing/${stats.largestExposure.id}`)}
          />
          <Item
            title="Top Risk Firm"
            value={stats.topRiskFirm?.name ?? "—"}
            tone="red"
            sm
            sub={stats.topRiskFirm ? `${stats.topRiskFirm.criticalCount} critical matters` : "—"}
            onClick={() => stats.topRiskFirm && nav(`/briefing/${stats.topRiskFirm.firstMatterId}`)}
          />
          <Item
            title="Critical Matters"
            value="View All"
            tone="red"
            sub="Open the full critical-matters list"
            onClick={() => nav("/matters/critical")}
          />
        </>
      )}
    </Widget>
  );
}

export function InvoiceQueueWidget() {
  const nav = useNavigate();
  return (
    <Widget id="invoiceQueue" title="Invoice Queue">
      <Item title="Pending Approval" value="—" tone="amber"
        sub="Open Alerts to review" onClick={() => nav("/alerts")} />
      <Item title="From Critical Matters" value="—" tone="red"
        sub="High-priority — review first" onClick={() => nav("/alerts")} />
      <Item title="Invoice Velocity Alert" value="—" tone="red"
        sub="Open Alerts for the latest signals" onClick={() => nav("/alerts")} />
    </Widget>
  );
}

export function RateCardFlagsWidget() {
  const nav = useNavigate();
  return (
    <Widget id="rateCardFlags" title="Rate Card Flags">
      <Item title="Rate Violations" value="—" tone="amber"
        sub="Open Alerts to review" onClick={() => nav("/alerts")} />
      <Item title="Timekeepers Over Rate" value="—" tone="amber"
        sub="Open Alerts to review" onClick={() => nav("/alerts")} />
    </Widget>
  );
}

function Item({
  title, value, tone, sub, sm, onClick
}: {
  title: string; value: string; tone: Tone; sub: string; sm?: boolean; onClick?: () => void;
}) {
  return (
    <button type="button" className="ri-item" onClick={onClick}>
      <div className="ri-item-title">{title}</div>
      <div className={`ri-item-val ${tone}${sm ? " sm" : ""}`}>{value}</div>
      <div className="ri-item-sub">{sub}</div>
    </button>
  );
}
