import { useNavigate } from "react-router-dom";
import {
  Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis
} from "recharts";
import type { DashboardViewModel } from "./selectors";

type TrendAndCategoryChartsProps = {
  practiceAreaRisk: DashboardViewModel["practiceAreaRisk"];
  riskHeatmap: DashboardViewModel["riskHeatmap"];
};

const C_CRIT = "#dc2626";
const C_WARN = "#d97706";
const C_HLT = "#059669";

/** Linear-interpolate between green→amber→red across the avg-risk range
 *  so the heatmap reads as a continuous gradient instead of three steps. */
function heatColor(avg: number, count: number): string {
  if (count === 0) return "#f3f4f6"; // empty cell — light gray
  if (avg >= 75) return C_CRIT;
  if (avg >= 65) return "#ea580c";
  if (avg >= 55) return C_WARN;
  if (avg >= 45) return "#65a30d";
  return C_HLT;
}

function textOnHeat(avg: number, count: number): string {
  if (count === 0) return "#9ca3af";
  return avg >= 45 ? "#fff" : "#fff";
}

function colorForRisk(avg: number): string {
  if (avg >= 75) return C_CRIT;
  if (avg >= 50) return C_WARN;
  return C_HLT;
}

/**
 * Insights screen "exposure pane":
 *   • Heatmap (Practice Area × Jurisdiction) — answers "where are our
 *     risk pockets?" in a single glance. Cell color = avg risk, cell
 *     number = matter count. Click a cell to deep-link into the matter
 *     list pre-filtered by that practice area.
 *   • Horizontal bar chart — top 10 practice areas by exposure, bar
 *     color matches risk level. Click a bar to drill in.
 *
 * Both visuals consume the live data already on the page; only the
 * encoding changed. See selectors.ts for the aggregation logic.
 */
export function TrendAndCategoryCharts({
  practiceAreaRisk, riskHeatmap
}: TrendAndCategoryChartsProps) {
  const navigate = useNavigate();
  const hasHeat = riskHeatmap.rows.length > 0 && riskHeatmap.cols.length > 0;

  return (
    <div style={{ display: "grid", gap: 12, gridTemplateColumns: "minmax(0, 3fr) minmax(0, 2fr)" }}>
      {/* ── HEATMAP ──────────────────────────────────────────────────── */}
      <section className="rounded-md border border-line bg-white shadow-widget" style={{ minWidth: 0 }}>
        <header className="px-3 py-2 bg-cardHdr text-cardHdrText font-bold text-[12px] rounded-t-md border-b border-line"
          style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span>🔥 Risk concentration · practice area × jurisdiction</span>
          <span style={{ fontSize: 10, fontWeight: 500, color: "var(--text-dim)" }}>
            color = avg risk · number = active matters · click to drill in
          </span>
        </header>
        <div style={{ padding: 12, overflow: "auto" }}>
          {hasHeat ? (
            <table style={{ borderCollapse: "separate", borderSpacing: 3, fontSize: 11, width: "100%" }}>
              <thead>
                <tr>
                  <th style={{ padding: "4px 8px", textAlign: "left", color: "var(--text-dim)", fontWeight: 600 }}></th>
                  {riskHeatmap.cols.map((c) => (
                    <th key={c.code} title={c.name}
                      style={{ padding: "4px 6px", textAlign: "center", color: "var(--text-dim)", fontWeight: 700, fontSize: 10 }}>
                      {c.code}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {riskHeatmap.rows.map((area) => (
                  <tr key={area}>
                    <th title={area}
                      style={{
                        padding: "4px 8px", textAlign: "left", color: "#1f2937", fontWeight: 600,
                        fontSize: 11, whiteSpace: "nowrap", maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis"
                      }}>
                      {area}
                    </th>
                    {riskHeatmap.cols.map((c) => {
                      const cell = riskHeatmap.cells[area]?.[c.code] ?? { count: 0, avgRisk: 0, critical: 0, warning: 0, healthy: 0 };
                      const bg = heatColor(cell.avgRisk, cell.count);
                      const fg = textOnHeat(cell.avgRisk, cell.count);
                      const tip = cell.count === 0
                        ? `${area} · ${c.name}: no matters`
                        : `${area} · ${c.name}\n${cell.count} matters · avg risk ${cell.avgRisk}\n🔴 ${cell.critical} · 🟡 ${cell.warning} · 🟢 ${cell.healthy}`;
                      return (
                        <td key={c.code} title={tip}
                          onClick={() => cell.count > 0 && navigate(`/matters/all?practiceArea=${encodeURIComponent(area)}`)}
                          style={{
                            background: bg, color: fg, textAlign: "center", fontWeight: 700,
                            padding: "10px 0", borderRadius: 4, cursor: cell.count > 0 ? "pointer" : "default",
                            minWidth: 38, transition: "transform 0.1s",
                            opacity: cell.count === 0 ? 0.5 : 1
                          }}
                          onMouseEnter={(e) => { if (cell.count > 0) (e.currentTarget as HTMLTableCellElement).style.transform = "scale(1.08)"; }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLTableCellElement).style.transform = "scale(1)"; }}>
                          {cell.count > 0 ? cell.count : "—"}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 220, color: "var(--text-dim)", fontSize: 12 }}>
              Not enough data to render the risk heatmap.
            </div>
          )}
          {hasHeat && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 10, marginTop: 10, fontSize: 10, color: "var(--text-dim)" }}>
              <span>Risk:</span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                <span style={{ display: "inline-block", width: 14, height: 10, background: C_HLT, borderRadius: 2 }} /> Healthy
              </span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                <span style={{ display: "inline-block", width: 14, height: 10, background: C_WARN, borderRadius: 2 }} /> Warning
              </span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                <span style={{ display: "inline-block", width: 14, height: 10, background: C_CRIT, borderRadius: 2 }} /> Critical
              </span>
            </div>
          )}
        </div>
      </section>

      {/* ── TOP PRACTICE AREAS BAR ──────────────────────────────────── */}
      <section className="rounded-md border border-line bg-white shadow-widget" style={{ minWidth: 0 }}>
        <header className="px-3 py-2 bg-cardHdr text-cardHdrText font-bold text-[12px] rounded-t-md border-b border-line"
          style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span>Top practice areas by exposure</span>
          <span style={{ fontSize: 10, fontWeight: 500, color: "var(--text-dim)" }}>
            bar = matter count · color = avg risk
          </span>
        </header>
        <div style={{ padding: 12, height: 280 }}>
          {practiceAreaRisk.length > 0 ? (
            <ResponsiveContainer>
              <BarChart
                data={practiceAreaRisk}
                layout="vertical"
                margin={{ top: 4, right: 24, left: 6, bottom: 0 }}
                onClick={(e: { activePayload?: Array<{ payload: DashboardViewModel["practiceAreaRisk"][number] }> } | null) => {
                  const row = e?.activePayload?.[0]?.payload;
                  if (row) navigate(`/matters/all?practiceArea=${encodeURIComponent(row.name)}`);
                }}
              >
                <CartesianGrid stroke="#dbe4ee" strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" stroke="#6b7c8d" fontSize={11} allowDecimals={false} />
                <YAxis type="category" dataKey="name" width={140} stroke="#374151" fontSize={11} />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 6, borderColor: "#bfcdd8" }}
                  formatter={(_value: number, _name: string, entry) => {
                    const row = entry?.payload as DashboardViewModel["practiceAreaRisk"][number] | undefined;
                    if (!row) return [_value, _name];
                    return [
                      `${row.count} matters · avg risk ${row.avgRisk} (🔴 ${row.critical} · 🟡 ${row.warning} · 🟢 ${row.healthy})`,
                      "Exposure"
                    ];
                  }}
                />
                <Bar dataKey="count" radius={[0, 4, 4, 0]} cursor="pointer">
                  {practiceAreaRisk.map((row) => (
                    <Cell key={row.name} fill={colorForRisk(row.avgRisk)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--text-dim)", fontSize: 12 }}>
              No practice area data available.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
