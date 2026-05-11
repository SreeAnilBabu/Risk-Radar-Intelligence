import type { JurisdictionRiskProfile, MatterRiskRecord, RiskAlert, RiskTrendPoint, VendorRiskSummary } from "../../types/domain";

export type DashboardViewModel = {
  kpis: {
    overallRisk: number;
    activeMatters: number;
    totalSpend: number;
    openAlerts: number;
  };
  practiceAreaDistribution: Array<{ name: string; value: number }>;
  /** Top-10 practice areas with risk-level breakdown for the horizontal bar
   *  chart. `avgRisk` drives bar color (red/amber/green); `count` drives
   *  bar length. Sorted by total matter count descending. */
  practiceAreaRisk: Array<{
    name: string;
    count: number;
    avgRisk: number;
    critical: number;
    warning: number;
    healthy: number;
  }>;
  trendSeries: Array<{ timestamp: string; California: number; NewYork: number; Texas: number }>;
  /** Stacked-area portfolio risk mix bucketed per month (kept for legacy
   *  callers — the active Insights screen now uses the heatmap). */
  riskMixOverTime: Array<{ timestamp: string; critical: number; warning: number; healthy: number }>;
  /** Practice-area × Jurisdiction risk heatmap. Rows = top practice
   *  areas, columns = top jurisdictions, cells = aggregated risk + matter
   *  count for that intersection. Drives the "where are the hot pockets?"
   *  matrix on Insights. */
  riskHeatmap: {
    rows: string[];                 // practice areas (top N by total matters)
    cols: { code: string; name: string }[]; // jurisdictions (top N by total matters)
    cells: Record<string, Record<string, { count: number; avgRisk: number; critical: number; warning: number; healthy: number }>>;
  };
  vendorRanking: Array<{ name: string; score: number; anomalies: number }>;
  anomalyPoints: Array<{ name: string; spend: number; risk: number }>;
};

export function buildDashboardViewModel(
  risks: JurisdictionRiskProfile[],
  matters: MatterRiskRecord[],
  alerts: RiskAlert[],
  vendors: VendorRiskSummary[],
  trends: RiskTrendPoint[]
): DashboardViewModel {
  const overallRisk = Math.round(risks.reduce((sum, item) => sum + item.overallRiskScore, 0) / risks.length);
  const activeMatters = matters.filter((matter) => matter.status !== "closed").length;
  const totalSpend = risks.reduce((sum, item) => sum + item.totalSpend, 0);
  const openAlerts = alerts.filter((alert) => alert.status !== "read").length;

  const practiceAreaMap = matters.reduce<Record<string, number>>((accumulator, matter) => {
    accumulator[matter.practiceArea] = (accumulator[matter.practiceArea] ?? 0) + 1;
    return accumulator;
  }, {});

  const practiceAreaDistribution = Object.entries(practiceAreaMap).map(([name, value]) => ({ name, value }));

  const trendSeries = trends
    .filter((point) => ["US-CA", "US-NY", "US-TX"].includes(point.jurisdictionId))
    .reduce<Record<string, { timestamp: string; California: number; NewYork: number; Texas: number }>>((accumulator, point) => {
      const row = accumulator[point.timestamp] ?? { timestamp: point.timestamp, California: 0, NewYork: 0, Texas: 0 };
      if (point.jurisdictionId === "US-CA") {
        row.California = point.score;
      }
      if (point.jurisdictionId === "US-NY") {
        row.NewYork = point.score;
      }
      if (point.jurisdictionId === "US-TX") {
        row.Texas = point.score;
      }
      accumulator[point.timestamp] = row;
      return accumulator;
    }, {});

  const anomalyPoints = vendors.map((vendor) => {
    const vendorMatters = matters.filter((matter) => matter.outsideCounselVendorId === vendor.id);
    const risk = vendorMatters.length === 0 ? 0 : Math.round(vendorMatters.reduce((sum, matter) => sum + matter.riskScore, 0) / vendorMatters.length);
    return { name: vendor.name, spend: vendor.totalSpend, risk };
  });

  // Practice-area horizontal bar chart: top 10 by matter count, with the
  // risk-level breakdown so we can color bars by avg risk and stack
  // critical/warning/healthy in tooltips.
  const paBuckets = matters.reduce<Record<string, { count: number; riskSum: number; critical: number; warning: number; healthy: number }>>((acc, m) => {
    const key = m.practiceArea || "Unspecified";
    const b = acc[key] ?? { count: 0, riskSum: 0, critical: 0, warning: 0, healthy: 0 };
    b.count += 1;
    b.riskSum += m.riskScore;
    if (m.riskScore >= 75) b.critical += 1;
    else if (m.riskScore >= 50) b.warning += 1;
    else b.healthy += 1;
    acc[key] = b;
    return acc;
  }, {});
  const practiceAreaRisk = Object.entries(paBuckets)
    .map(([name, b]) => ({
      name,
      count: b.count,
      avgRisk: b.count > 0 ? Math.round(b.riskSum / b.count) : 0,
      critical: b.critical,
      warning: b.warning,
      healthy: b.healthy
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Stacked-area portfolio risk mix over time: re-buckets the existing
  // jurisdiction-level trend points by month and counts how many
  // jurisdictions sat in each risk band. Uses the same critical (≥75) /
  // warning (50–74) / healthy (<50) thresholds as the rest of the app, so
  // the area chart and the KPI tiles always tell a consistent story.
  const monthBuckets = new Map<string, { timestamp: string; critical: number; warning: number; healthy: number }>();
  for (const t of trends) {
    const month = t.timestamp.slice(0, 7); // YYYY-MM
    const row = monthBuckets.get(month) ?? { timestamp: `${month}-01`, critical: 0, warning: 0, healthy: 0 };
    if (t.score >= 75) row.critical += 1;
    else if (t.score >= 50) row.warning += 1;
    else row.healthy += 1;
    monthBuckets.set(month, row);
  }
  const riskMixOverTime = [...monthBuckets.values()].sort((a, b) => a.timestamp.localeCompare(b.timestamp));

  // ── Practice Area × Jurisdiction risk heatmap ──────────────────────
  // Pick the top 8 practice areas + top 8 jurisdictions by matter count,
  // then bucket each matter into the resulting cell. Cells store both
  // count (drives label / sort) and avg risk (drives color). Anything
  // outside the top-N is intentionally dropped — the heatmap is for
  // executive scanning, not exhaustive coverage.
  const TOP_AREAS = 8;
  const TOP_JURIS = 8;

  const areaTotals = new Map<string, number>();
  const jurisTotals = new Map<string, { name: string; total: number }>();
  for (const m of matters) {
    const area = m.practiceArea || "Unspecified";
    areaTotals.set(area, (areaTotals.get(area) ?? 0) + 1);
    const code = m.jurisdictionCode || m.jurisdictionId || "—";
    const name = m.jurisdictionName || m.jurisdictionCode || "—";
    const cur = jurisTotals.get(code) ?? { name, total: 0 };
    cur.total += 1;
    jurisTotals.set(code, cur);
  }
  const heatRows = [...areaTotals.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, TOP_AREAS)
    .map(([name]) => name);
  const heatCols = [...jurisTotals.entries()]
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, TOP_JURIS)
    .map(([code, v]) => ({ code, name: v.name }));

  const rowSet = new Set(heatRows);
  const colSet = new Set(heatCols.map((c) => c.code));
  const cells: DashboardViewModel["riskHeatmap"]["cells"] = {};
  for (const r of heatRows) cells[r] = {};
  for (const m of matters) {
    const area = m.practiceArea || "Unspecified";
    const code = m.jurisdictionCode || m.jurisdictionId || "—";
    if (!rowSet.has(area) || !colSet.has(code)) continue;
    const c = cells[area][code] ?? { count: 0, avgRisk: 0, critical: 0, warning: 0, healthy: 0 };
    const prevSum = c.avgRisk * c.count;
    c.count += 1;
    c.avgRisk = Math.round((prevSum + m.riskScore) / c.count);
    if (m.riskScore >= 75) c.critical += 1;
    else if (m.riskScore >= 50) c.warning += 1;
    else c.healthy += 1;
    cells[area][code] = c;
  }

  return {
    kpis: { overallRisk, activeMatters, totalSpend, openAlerts },
    practiceAreaDistribution,
    practiceAreaRisk,
    trendSeries: Object.values(trendSeries),
    riskMixOverTime,
    riskHeatmap: { rows: heatRows, cols: heatCols, cells },
    vendorRanking: vendors
      .map((vendor) => ({ name: vendor.name, score: vendor.performanceRiskScore, anomalies: vendor.billingAnomalyCount }))
      .sort((left, right) => right.score - left.score),
    anomalyPoints
  };
}
