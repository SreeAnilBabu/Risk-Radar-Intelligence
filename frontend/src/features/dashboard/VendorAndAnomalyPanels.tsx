import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis } from "recharts";
import type { DashboardViewModel } from "./selectors";

type VendorAndAnomalyPanelsProps = {
  vendorRanking: DashboardViewModel["vendorRanking"];
  anomalyPoints: DashboardViewModel["anomalyPoints"];
};

export function VendorAndAnomalyPanels({ vendorRanking, anomalyPoints }: VendorAndAnomalyPanelsProps) {
  return (
    <div className="grid gap-3 xl:grid-cols-2">
      <section className="rounded-md border border-line bg-white shadow-widget">
        <header className="px-3 py-2 bg-cardHdr text-cardHdrText font-bold text-[12px] rounded-t-md border-b border-line">
          Vendor concentration and risk
        </header>
        <div className="p-3 h-64">
          <ResponsiveContainer>
            <BarChart data={vendorRanking} layout="vertical" margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="#dbe4ee" strokeDasharray="3 3" />
              <XAxis type="number" stroke="#6b7c8d" fontSize={11} />
              <YAxis type="category" dataKey="name" width={140} stroke="#6b7c8d" fontSize={11} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 6, borderColor: "#bfcdd8" }} />
              <Bar dataKey="score" fill="#b7770d" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
      <section className="rounded-md border border-line bg-white shadow-widget">
        <header className="px-3 py-2 bg-cardHdr text-cardHdrText font-bold text-[12px] rounded-t-md border-b border-line">
          Spend versus risk anomalies
        </header>
        <div className="p-3 h-64">
          <ResponsiveContainer>
            <ScatterChart margin={{ top: 8, right: 12, left: -10, bottom: 0 }}>
              <CartesianGrid stroke="#dbe4ee" strokeDasharray="3 3" />
              <XAxis dataKey="spend" name="Spend" stroke="#6b7c8d" fontSize={11} />
              <YAxis dataKey="risk" name="Risk" stroke="#6b7c8d" fontSize={11} />
              <Tooltip cursor={{ strokeDasharray: "3 3" }} contentStyle={{ fontSize: 12, borderRadius: 6, borderColor: "#bfcdd8" }} />
              <Scatter data={anomalyPoints} fill="#1a5f9c" />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
}
