/**
 * riskSignals.ts — derives the five canonical RiskRadar signal scores from the
 * Passport-shaped matter data we already have in the seed (`budget`, `actual`,
 * matter type, firm). Each score is normalised to 0–100 and bucketed into
 * Critical / Watch / Stable bands.
 *
 * The math is intentionally transparent: every demo number on the Briefing
 * screen can be traced back to a real attribute. When the live Passport DB is
 * wired in, swap the inputs for the values returned by
 * `GET /api/matters/:id/briefing` — the formulas stay identical.
 */
import { passportMatters, type PassportMatter } from "../data/passportSeed";

export type SignalLevel = "critical" | "watch" | "stable";

export interface SignalScore {
  key: "budgetBurn" | "invoiceVelocity" | "vendorRisk" | "timelineRisk" | "compliance";
  label: string;
  score: number; // 0–100
  level: SignalLevel;
  detail: string; // one-line "why" surfaced under each bar
}

export interface SignalBundle {
  signals: SignalScore[];
  overall: number;
  cluster: PassportMatter[]; // related matters used in the calc (same firm)
  invoiceLast14: number;
  portfolioAvg: number;
  daysUntilExhausted: number;
}

const BAND = (score: number): SignalLevel =>
  score >= 75 ? "critical" : score >= 50 ? "watch" : "stable";

/** Deterministic invoice count per matter (last 14d). Until the live Passport
 *  query is wired in (`fetchInvoiceVelocity`), we hash the matter id so the
 *  same demo always shows the same numbers. */
function invoicesForMatter(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i += 1) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return 1 + (h % 8); // 1–8
}

export function computeSignals(matter: PassportMatter): SignalBundle {
  const cluster = passportMatters.filter(
    (m) => m.firm === matter.firm && m.type === matter.type
  );

  // 1. Budget Burn — actual vs budget. Matters at 100% = score 100.
  const burnPct = (matter.actual / Math.max(1, matter.budget)) * 100;
  const budgetBurn = Math.min(100, Math.round(burnPct));

  // 2. Invoice Velocity — last-14-day rate vs portfolio mean.
  const invoiceLast14 = invoicesForMatter(matter.id);
  const portfolioAvg = Math.round(
    passportMatters.reduce((sum, m) => sum + invoicesForMatter(m.id), 0) /
      passportMatters.length
  );
  const velocityRatio = invoiceLast14 / Math.max(1, portfolioAvg);
  const invoiceVelocity = Math.min(100, Math.round(velocityRatio * 35 + 15));

  // 3. Vendor Risk — share of firm's matters that are non-healthy + cluster size.
  const firmMatters = passportMatters.filter((m) => m.firm === matter.firm);
  const firmTrouble = firmMatters.filter((m) => m.level !== "healthy").length;
  const firmShare = firmTrouble / Math.max(1, firmMatters.length);
  const vendorRisk = Math.min(100, Math.round(firmShare * 70 + cluster.length * 5));

  // 4. Timeline Risk — overrun severity nudges this up; simple proxy until we
  //    wire matter open / expected-close dates from P_MATTER.
  const overrun = burnPct - 100;
  const timelineRisk = Math.max(
    20,
    Math.min(100, Math.round(40 + (overrun > 0 ? overrun / 2 : -overrun / 4)))
  );

  // 5. Compliance — driven by overrun magnitude + cluster firm-share.
  const compliance = Math.max(
    20,
    Math.min(100, Math.round(30 + firmShare * 30 + Math.max(0, overrun) / 5))
  );

  // Days until budget exhaustion at current daily burn (assume 90 days elapsed).
  const daily = matter.actual / 90;
  const remaining = Math.max(0, matter.budget - matter.actual);
  const daysUntilExhausted = daily > 0 ? Math.max(0, Math.round(remaining / daily)) : 999;

  const signals: SignalScore[] = [
    {
      key: "budgetBurn",
      label: "Budget Burn",
      score: budgetBurn,
      level: BAND(budgetBurn),
      detail: `${Math.round(burnPct)}% of approved budget consumed`
    },
    {
      key: "invoiceVelocity",
      label: "Invoice Velocity",
      score: invoiceVelocity,
      level: BAND(invoiceVelocity),
      detail: `${invoiceLast14} invoices in 14 days · portfolio avg ${portfolioAvg}`
    },
    {
      key: "vendorRisk",
      label: "Vendor Risk",
      score: vendorRisk,
      level: BAND(vendorRisk),
      detail: `${firmTrouble} of ${firmMatters.length} ${matter.firm} matters non-healthy`
    },
    {
      key: "timelineRisk",
      label: "Timeline Risk",
      score: timelineRisk,
      level: BAND(timelineRisk),
      detail:
        overrun > 0
          ? `${Math.round(overrun)}% over budget — pace exceeds plan`
          : "Burn rate within planned timeline"
    },
    {
      key: "compliance",
      label: "Compliance",
      score: compliance,
      level: BAND(compliance),
      detail: `${Math.round(firmShare * 100)}% of firm portfolio flagged for review`
    }
  ];

  const overall = Math.round(signals.reduce((s, sig) => s + sig.score, 0) / signals.length);

  return {
    signals,
    overall,
    cluster,
    invoiceLast14,
    portfolioAvg,
    daysUntilExhausted
  };
}
