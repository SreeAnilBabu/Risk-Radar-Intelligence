import type { VendorRiskSummary } from "../../types/domain";

export function VendorSpendPanel({ vendors }: { vendors: VendorRiskSummary[] }) {
  return (
    <section className="rounded-md border border-line bg-white shadow-widget overflow-hidden">
      <header className="px-3 py-2 bg-cardHdr text-cardHdrText border-b border-line text-[13px] font-bold">
        Vendor and spend context
      </header>
      <div className="p-3 space-y-2">
        {vendors.map((vendor) => (
          <div key={vendor.id} className="rounded border border-line bg-rowAlt p-3">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-[13px] font-bold text-ink">{vendor.name}</h3>
              <span
                className={`rounded border px-2 py-0.5 text-[10px] font-semibold ${
                  vendor.performanceRiskScore >= 70
                    ? "border-risk-red/40 bg-riskBg-red text-risk-red"
                    : vendor.performanceRiskScore >= 50
                    ? "border-risk-amber/40 bg-riskBg-amber text-risk-amber"
                    : "border-risk-green/40 bg-riskBg-green text-risk-green"
                }`}
              >
                Risk {vendor.performanceRiskScore}
              </span>
            </div>
            <p className="mt-1 text-[12px] text-inkDim">
              Spend {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(vendor.totalSpend)} · Billing anomalies {vendor.billingAnomalyCount}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
