import { useMemo, useState } from "react";
import type { MatterRiskRecord } from "../../types/domain";

type MatterTableProps = {
  matters: MatterRiskRecord[];
};

type SortKey = "title" | "riskScore" | "spendToDate";

export function MatterTable({ matters }: MatterTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("riskScore");

  const sortedMatters = useMemo(() => [...matters].sort((left, right) => {
    if (sortKey === "title") {
      return left.title.localeCompare(right.title);
    }
    return right[sortKey] - left[sortKey];
  }), [matters, sortKey]);

  return (
    <section className="rounded-md border border-line bg-white shadow-widget overflow-hidden">
      <header className="flex items-center justify-between gap-3 px-3 py-2 bg-cardHdr text-cardHdrText border-b border-line">
        <h2 className="text-[13px] font-bold">Matter drivers</h2>
        <label className="text-[11px]">
          Sort by
          <select
            className="ml-1.5 rounded border border-line bg-white px-2 py-1 text-[11px] text-ink"
            value={sortKey}
            onChange={(event) => setSortKey(event.target.value as SortKey)}
          >
            <option value="riskScore">Risk</option>
            <option value="spendToDate">Spend</option>
            <option value="title">Title</option>
          </select>
        </label>
      </header>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-[12px]">
          <thead className="bg-rowAlt text-inkDim text-[10px] uppercase tracking-wider">
            <tr>
              <th className="px-3 py-2 font-bold">Matter</th>
              <th className="px-3 py-2 font-bold">Practice area</th>
              <th className="px-3 py-2 font-bold">Risk</th>
              <th className="px-3 py-2 font-bold">Spend</th>
            </tr>
          </thead>
          <tbody>
            {sortedMatters.map((matter, idx) => (
              <tr key={matter.id} className={`text-ink border-t border-line ${idx % 2 ? "bg-rowAlt" : ""}`}>
                <td className="px-3 py-2 font-semibold">{matter.title}</td>
                <td className="px-3 py-2">{matter.practiceArea}</td>
                <td className={`px-3 py-2 font-bold ${matter.riskScore >= 80 ? "text-risk-red" : matter.riskScore >= 60 ? "text-risk-amber" : "text-risk-green"}`}>{matter.riskScore}</td>
                <td className="px-3 py-2">{new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(matter.spendToDate)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
