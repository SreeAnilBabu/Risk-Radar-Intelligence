import type { DashboardViewModel } from "./selectors";

type KpiCardsProps = {
  kpis: DashboardViewModel["kpis"];
};

export function KpiCards({ kpis }: KpiCardsProps) {
  const items = [
    { label: "Overall risk", value: kpis.overallRisk.toString() },
    { label: "Active matters", value: kpis.activeMatters.toString() },
    { label: "Total spend", value: new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(kpis.totalSpend) },
    { label: "Open alerts", value: kpis.openAlerts.toString() }
  ];

  const accent = ["text-risk-red", "text-risk-blue", "text-risk-green", "text-risk-amber"];

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {items.map((item, idx) => (
        <div
          key={item.label}
          className="rounded-md border border-line bg-white p-3 shadow-widget"
        >
          <p className="text-[10px] uppercase tracking-[0.18em] text-inkDim font-bold">
            {item.label}
          </p>
          <p className={`mt-1.5 text-[26px] font-extrabold leading-none ${accent[idx % 4]}`}>
            {item.value}
          </p>
        </div>
      ))}
    </div>
  );
}
