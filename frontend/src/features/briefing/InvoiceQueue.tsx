/**
 * InvoiceQueue — pending-invoice list with budget context for the Briefing
 * screen. Solves the BRD gap that today's reviewer approves invoices in
 * isolation, blind to remaining budget. Data is synthesised deterministically
 * from the matter id so the demo is reproducible; swap in a real
 * P_INVOICE_HEADER + P_INVOICE_SUMMARY query when Passport is wired.
 */
import { useMemo, useState } from "react";
import type { PassportMatter } from "../../data/passportSeed";
import type { SignalBundle } from "../../lib/riskSignals";

interface PendingInvoice {
  number: string;
  date: string;
  amount: number;
  status: "Pending" | "On Hold" | "Approved";
  rateFlag: boolean;
}

function buildInvoices(matter: PassportMatter, bundle: SignalBundle): PendingInvoice[] {
  // Distribute the last-14-day count across 4 representative invoices.
  const count = Math.max(1, Math.min(6, bundle.invoiceLast14));
  const burnRate = matter.actual / 90; // approx daily burn
  const items: PendingInvoice[] = [];
  for (let i = 0; i < count; i += 1) {
    const daysAgo = i * 3 + 2;
    const amount = Math.round(burnRate * (3 + (i % 3)) + 4000 * ((i + 1) % 4));
    items.push({
      number: `INV-${(2800 + (parseInt(matter.id.replace(/\D/g, ""), 10) % 100) + i).toString()}`,
      date: new Date(Date.now() - daysAgo * 86400000).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric"
      }),
      amount,
      status: i === 0 && bundle.signals.find((s) => s.key === "vendorRisk")?.level === "critical" ? "On Hold" : "Pending",
      rateFlag: i === 0 && bundle.signals.find((s) => s.key === "vendorRisk")?.level !== "stable"
    });
  }
  return items;
}

interface InvoiceQueueProps {
  matter: PassportMatter;
  bundle: SignalBundle;
  /** Optional live data from `GET /api/matters/:id/briefing`. When provided
   *  the synthesised invoice list is replaced and budget figures override
   *  the seed-derived numbers. */
  live?: {
    invoices?: Array<{
      invoiceNumber: string;
      invoiceDate: string;
      amount: number;
      status: string;
      hasErrors: boolean;
      isVoided: boolean;
    }>;
    budgetTotal?: number;
    spendTotal?: number;
    daysUntilBudgetExhausted?: number;
  };
}

export function InvoiceQueue({ matter, bundle, live }: InvoiceQueueProps) {
  // When the live payload is provided (Passport mode) we ALWAYS trust it —
  // including when it returns zero invoices, so the UI never shows fake
  // INV-XXXX rows. The seed-derived `buildInvoices` fallback only runs in
  // pure fixture mode (when `live` itself is undefined).
  const isLiveMode = live !== undefined;
  const invoices: PendingInvoice[] = isLiveMode
    ? (live!.invoices ?? []).map((inv) => ({
        number: inv.invoiceNumber,
        date: new Date(inv.invoiceDate).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        amount: inv.amount,
        status: inv.isVoided ? "On Hold" : /approved|paid/i.test(inv.status) ? "Approved" : "Pending",
        rateFlag: inv.hasErrors
      }))
    : buildInvoices(matter, bundle);
  // Search-by-invoice-number / status. Hidden until there are >5 rows so the
  // common 1-3 invoice case stays clutter-free.
  const [search, setSearch] = useState("");
  const visibleInvoices = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return invoices;
    return invoices.filter((i) =>
      i.number.toLowerCase().includes(q) ||
      i.status.toLowerCase().includes(q) ||
      i.date.toLowerCase().includes(q)
    );
  }, [invoices, search]);
  const totalPending = invoices
    .filter((i) => i.status !== "Approved")
    .reduce((s, i) => s + i.amount, 0);
  const budgetTotal = live?.budgetTotal ?? matter.budget;
  const spendTotal = live?.spendTotal ?? matter.actual;
  const remainingBudget = Math.max(0, budgetTotal - spendTotal);
  const daysUntilExhausted = live?.daysUntilBudgetExhausted ?? bundle.daysUntilExhausted;
  const fmt = (n: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);

  return (
    <div className="invq">
      <div className="invq-summary">
        <div className="invq-stat">
          <div className="invq-stat-num">{invoices.length}</div>
          <div className="invq-stat-lbl">Pending invoices</div>
        </div>
        <div className="invq-stat">
          <div className="invq-stat-num">{fmt(totalPending)}</div>
          <div className="invq-stat-lbl">Awaiting approval</div>
        </div>
        <div className="invq-stat">
          <div className="invq-stat-num" style={{ color: remainingBudget <= 0 ? "var(--red)" : "var(--text)" }}>
            {fmt(remainingBudget)}
          </div>
          <div className="invq-stat-lbl">Budget remaining</div>
        </div>
        <div className="invq-stat">
          <div className="invq-stat-num" style={{ color: "var(--red)" }}>
            {daysUntilExhausted} days
          </div>
          <div className="invq-stat-lbl">Until budget exhausted</div>
        </div>
      </div>

      {invoices.length > 5 && (
        <div style={{ display: "flex", gap: 8, alignItems: "center", padding: "6px 0" }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-dim)" }}>🔍 Search</span>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Invoice #, status, date…"
            style={{
              flex: 1, maxWidth: 280, padding: "4px 9px", fontSize: 12,
              border: "1px solid var(--border)", borderRadius: 4, background: "#fff"
            }}
          />
          {search && (
            <button type="button" className="mlink" style={{ fontSize: 11 }}
              onClick={() => setSearch("")}>clear</button>
          )}
          <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--text-dim)" }}>
            {search ? `${visibleInvoices.length} of ${invoices.length}` : `${invoices.length} invoices`}
          </span>
        </div>
      )}

      <table className="pp-tbl">
        <thead>
          <tr>
            <th>Invoice #</th>
            <th>Date</th>
            <th>Amount</th>
            <th>Status</th>
            <th>Flags</th>
          </tr>
        </thead>
        <tbody>
          {visibleInvoices.map((inv) => (
            <tr key={inv.number}>
              <td style={{ fontWeight: 700 }}>{inv.number}</td>
              <td>{inv.date}</td>
              <td style={{ fontWeight: 700 }}>{fmt(inv.amount)}</td>
              <td>
                <span className={`risk-pill ${inv.status === "On Hold" ? "red" : inv.status === "Approved" ? "green" : "amber"}`}>
                  {inv.status}
                </span>
              </td>
              <td>
                {inv.rateFlag ? (
                  <span style={{ color: "var(--red)", fontWeight: 700 }}>
                    ⚠ Rate exceeds approved card
                  </span>
                ) : (
                  <span style={{ color: "var(--text-dim)" }}>—</span>
                )}
              </td>
            </tr>
          ))}
          {invoices.length === 0 && (
            <tr>
              <td colSpan={5} style={{ textAlign: "center", padding: 14, color: "var(--text-dim)" }}>
                No invoices found in Passport for this matter.
              </td>
            </tr>
          )}
          {invoices.length > 0 && visibleInvoices.length === 0 && (
            <tr>
              <td colSpan={5} style={{ textAlign: "center", padding: 14, color: "var(--text-dim)" }}>
                No invoices match “{search}”.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
