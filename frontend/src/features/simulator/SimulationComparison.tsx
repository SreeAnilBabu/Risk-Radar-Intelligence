import type { SimulationResult } from "../../types/domain";

export function SimulationComparison({ result }: { result: SimulationResult }) {
  return (
    <section className="rounded-md border border-line bg-white p-4 shadow-widget">
      {result.isApproximation && result.disclaimer ? (
        <div className="rounded border border-risk-amber/40 bg-riskBg-amber px-3 py-2 text-[12px] text-ink">
          {result.disclaimer}
        </div>
      ) : null}
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        {result.projectedJurisdictionChanges.map((change) => (
          <div key={change.jurisdictionId} className="rounded border border-line bg-rowAlt p-3">
            <p className="text-[10px] uppercase tracking-wider font-bold text-inkDim">{change.jurisdictionId}</p>
            <p className="mt-1 text-[12px] text-ink">
              Before {change.beforeScore} ({change.beforeLevel})
            </p>
            <p className="text-[14px] font-bold text-ink">
              After {change.afterScore} ({change.afterLevel})
            </p>
            <p className={`mt-1 text-[12px] font-semibold ${change.delta >= 0 ? "text-risk-red" : "text-risk-green"}`}>
              Delta {change.delta >= 0 ? "+" : ""}
              {change.delta}
            </p>
          </div>
        ))}
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-[1fr_2fr]">
        <div className="rounded border border-line bg-rowAlt p-3">
          <p className="text-[10px] uppercase tracking-wider font-bold text-inkDim">Projected financial impact</p>
          <p className="mt-1 text-[22px] font-extrabold text-risk-blue">
            {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(result.projectedFinancialImpact)}
          </p>
        </div>
        <div className="rounded border border-line bg-rowAlt p-3">
          <p className="text-[10px] uppercase tracking-wider font-bold text-inkDim">Recommended mitigations</p>
          <ul className="mt-1.5 space-y-1 text-[12px] text-ink">
            {result.recommendedMitigations.map((item) => (
              <li key={item}>• {item}</li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
