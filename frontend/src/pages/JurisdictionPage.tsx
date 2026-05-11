import { useParams } from "react-router-dom";
import { useJurisdictionDrilldown } from "../features/drilldown/useJurisdictionDrilldown";
import { LoadingSkeleton } from "../components/feedback/LoadingSkeleton";
import { ErrorState } from "../components/feedback/ErrorState";
import { MatterTable } from "../features/drilldown/MatterTable";
import { VendorSpendPanel } from "../features/drilldown/VendorSpendPanel";

export function JurisdictionPage() {
  const { id } = useParams();
  const { jurisdiction, matters, vendors, loading, error } = useJurisdictionDrilldown(id);

  if (loading) {
    return <LoadingSkeleton lines={8} className="h-[520px]" />;
  }

  if (error || !jurisdiction) {
    return <ErrorState message={error ?? "Jurisdiction detail is unavailable."} />;
  }

  return (
    <div className="px-4 py-3 max-w-[1500px] mx-auto space-y-3">
      <section className="rounded-md border border-line bg-white p-4 shadow-widget">
        <p className="text-[10px] uppercase tracking-wider text-inkDim font-bold">Drill-down investigation</p>
        <h2 className="mt-1 text-[18px] font-extrabold text-ink">{jurisdiction.name}</h2>
        <p className="mt-1 text-[12px] text-inkDim">
          Score {jurisdiction.overallRiskScore} · {jurisdiction.riskLevel.toUpperCase()} · {jurisdiction.trendDirection} trend · {jurisdiction.openAlerts} open alerts
        </p>
      </section>
      <div className="grid gap-3 xl:grid-cols-[1.7fr_1fr]">
        <MatterTable matters={matters} />
        <VendorSpendPanel vendors={vendors} />
      </div>
    </div>
  );
}
