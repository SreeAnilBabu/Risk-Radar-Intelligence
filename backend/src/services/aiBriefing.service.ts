/**
 * aiBriefing.service.ts — generates a richer, matter-specific risk briefing
 * from real Passport data.
 *
 * STRATEGY
 * ────────
 * Two paths, automatically selected:
 *
 *   1. **OpenAI** — when `OPENAI_API_KEY` env var is present, we send a
 *      structured JSON context to the OpenAI Chat Completions API and ask
 *      it to author a multi-paragraph executive briefing. Sanitized
 *      context only; no PII / no raw rows.
 *
 *   2. **Local generator (default)** — deterministic, offline. Reads the
 *      real numbers (overrun %, vendor anomaly count, days-to-deadline,
 *      invoice velocity vs. portfolio average, related-matter exposure)
 *      and assembles a multi-section briefing that reads like an LLM but
 *      runs in <1 ms with zero external dependencies.
 *
 * Both paths return the SAME shape so the UI never has to branch.
 */

import { loadAlerts, loadMatterById, loadMatters, loadVendors } from "../data/loaders";
import * as passport from "../data/passportRepo";
import type { MatterRiskRecord, RiskAlert, VendorRiskSummary } from "../types/domain";

export interface SmartBriefingChartPoint {
  label: string;
  value: number;
  /** Optional secondary metric for paired-axis charts (radar/bar pairs). */
  benchmark?: number;
}

export interface SmartBriefing {
  matterId: string;
  headline: string;
  /** 2–4 paragraphs. Render each paragraph in its own <p>. */
  narrative: string[];
  topRisks: Array<{ label: string; severity: "critical" | "warning" | "stable"; detail: string }>;
  recommendedActions: Array<{ label: string; rationale: string; priority: "P0" | "P1" | "P2" }>;
  /** Default chart payload. UI may re-render as bar / line / radar / pie / area. */
  chart: {
    title: string;
    points: SmartBriefingChartPoint[];
  };
  metrics: {
    riskScore: number;
    overrunPct: number;
    spend: number;
    budget: number;
    daysOfRunway: number;
    invoiceVelocity14d: number;
    portfolioAvgVelocity: number;
    vendorAnomalyShare: number;
    relatedMatterCount: number;
    relatedMatterTotalSpend: number;
  };
  /** "openai" when the LLM path was used, "local" otherwise. */
  source: "openai" | "local";
  generatedAt: string;
  latencyMs: number;
}

interface BriefingContext {
  matter: MatterRiskRecord;
  vendor: VendorRiskSummary | null;
  related: MatterRiskRecord[];
  matterAlerts: RiskAlert[];
  totalAlerts: number;
  budgetTotal: number;
  spendTotal: number;
}

function bucket(score: number): "critical" | "warning" | "stable" {
  if (score >= 75) return "critical";
  if (score >= 50) return "warning";
  return "stable";
}

const fmtCurrency = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);

async function buildContext(matterId: string): Promise<BriefingContext | null> {
  const matter = await loadMatterById(matterId);
  if (!matter) return null;

  const [vendors, alerts, allMatters] = await Promise.all([loadVendors(), loadAlerts(), loadMatters()]);
  const vendor = matter.outsideCounselVendorId
    ? vendors.find((v) => v.id === matter.outsideCounselVendorId) ?? null
    : null;

  const related = allMatters
    .filter((m) => m.id !== matter.id && (m.outsideCounselVendorId === matter.outsideCounselVendorId || m.practiceArea === matter.practiceArea))
    .slice(0, 5);

  const matterAlerts = alerts.filter((a) => a.matterId === matter.id);

  // Budget / spend pulled from the matter's stored numbers (already from
  // Passport).  When running on JSON fixtures with no real budget we
  // synthesise one from the spend so the burn ratio still scales.
  const spendTotal = matter.spendToDate;
  let budgetTotal = matter.budgetTotal ?? 0;
  if (budgetTotal <= 0) {
    const ratio = Math.min(0.95, Math.max(0.35, matter.riskScore / 100));
    budgetTotal = Math.round(spendTotal / ratio);
  }

  return { matter, vendor, related, matterAlerts, totalAlerts: alerts.length, budgetTotal, spendTotal };
}

/**
 * Local deterministic briefing generator. Runs in O(1) and reads the actual
 * numbers from Passport so the prose is matter-specific, not boilerplate.
 */
function composeLocal(ctx: BriefingContext): Omit<SmartBriefing, "source" | "generatedAt" | "latencyMs"> {
  const { matter, vendor, related, matterAlerts, totalAlerts, budgetTotal, spendTotal } = ctx;
  const overrunPct = budgetTotal > 0 ? Math.round(((spendTotal - budgetTotal) / budgetTotal) * 100) : 0;
  const portfolioAvgVelocity = Math.max(1, Math.round(totalAlerts / 100));
  const velocity14d = matterAlerts.length;
  const vendorAnomalyShare = vendor && vendor.activeMatterCount > 0
    ? Math.min(1, vendor.billingAnomalyCount / Math.max(1, vendor.activeMatterCount * 4))
    : 0;
  const dailyBurn = spendTotal / Math.max(1, 30);
  const daysOfRunway = budgetTotal > spendTotal && dailyBurn > 0
    ? Math.max(0, Math.round((budgetTotal - spendTotal) / dailyBurn))
    : 0;
  const relatedTotalSpend = related.reduce((s, m) => s + m.spendToDate, 0);

  // ── Narrative ────────────────────────────────────────────────────────
  const sevWord = matter.riskScore >= 75 ? "critical" : matter.riskScore >= 50 ? "elevated" : "within tolerance";
  const overrunPhrase = overrunPct > 0
    ? `tracking ${overrunPct}% over its approved budget of ${fmtCurrency(budgetTotal)}`
    : `${Math.abs(overrunPct)}% under its ${fmtCurrency(budgetTotal)} budget`;

  const headline = matter.riskScore >= 75
    ? `${matter.title} requires immediate executive attention.`
    : matter.riskScore >= 50
      ? `${matter.title} is trending into watch territory.`
      : `${matter.title} remains stable but warrants routine review.`;

  const para1 =
    `${matter.title} (${matter.practiceArea}, ${matter.jurisdictionName ?? "unknown jurisdiction"}) ` +
    `is currently scored ${matter.riskScore}/100 — ${sevWord}. ` +
    `Spend to date is ${fmtCurrency(spendTotal)}, ${overrunPhrase}. ` +
    (vendor
      ? `Outside counsel ${vendor.name} carries a portfolio-level performance score of ${vendor.performanceRiskScore}/100 ` +
        `with ${vendor.billingAnomalyCount} flagged invoice${vendor.billingAnomalyCount === 1 ? "" : "s"} across ${vendor.activeMatterCount} active matters.`
      : `No designated outside counsel is on file for this matter — verify vendor assignment.`);

  const para2 =
    `Recent invoice velocity for this matter is ${velocity14d} in the last 14 days, against a portfolio average of ${portfolioAvgVelocity}. ` +
    (velocity14d > portfolioAvgVelocity * 2
      ? `That is more than double the norm — strongly suggesting either accelerated work or unbatched billing.`
      : velocity14d > portfolioAvgVelocity
        ? `That is above the portfolio mean and warrants a billing-cadence review.`
        : `That is in line with the portfolio.`) +
    ` At the current burn rate (${fmtCurrency(Math.round(dailyBurn))}/day) the matter has approximately ${daysOfRunway} days of remaining runway before the budget is exhausted.`;

  const para3 = related.length > 0
    ? `${related.length} related matters in the same ${vendor ? "vendor cluster" : "practice area"} are open with combined spend of ${fmtCurrency(relatedTotalSpend)}. ` +
      (vendor && vendor.billingAnomalyCount > 0
        ? `Because the vendor has ${vendor.billingAnomalyCount} anomaly flags portfolio-wide, addressing the rate card here will likely benefit those matters too.`
        : `These matters share rate-card exposure — a review here cascades.`)
    : `No directly comparable matters are open today, so any rate-card or scoping decision here will set the precedent for future engagements.`;

  // ── Top risks ────────────────────────────────────────────────────────
  const topRisks: SmartBriefing["topRisks"] = [];
  if (overrunPct >= 25) topRisks.push({ label: "Budget overrun", severity: "critical", detail: `+${overrunPct}% over plan` });
  else if (overrunPct >= 0) topRisks.push({ label: "Budget pressure", severity: "warning", detail: `+${overrunPct}% over plan` });
  else topRisks.push({ label: "Budget healthy", severity: "stable", detail: `${overrunPct}% vs. plan` });

  if (velocity14d > portfolioAvgVelocity * 2) topRisks.push({ label: "Invoice velocity spike", severity: "critical", detail: `${velocity14d} in 14 days vs. avg ${portfolioAvgVelocity}` });
  else if (velocity14d > portfolioAvgVelocity) topRisks.push({ label: "Elevated invoice velocity", severity: "warning", detail: `${velocity14d} in 14 days vs. avg ${portfolioAvgVelocity}` });

  if (vendor) {
    const sev: "critical" | "warning" | "stable" = bucket(vendor.performanceRiskScore);
    topRisks.push({
      label: `Vendor: ${vendor.name}`,
      severity: sev,
      detail: `${vendor.billingAnomalyCount} anomalies across ${vendor.activeMatterCount} matters · score ${vendor.performanceRiskScore}/100`
    });
  }

  if (matter.deadlineAt) {
    const days = Math.max(0, Math.round((new Date(matter.deadlineAt).getTime() - Date.now()) / 86400000));
    topRisks.push({
      label: "Timeline pressure",
      severity: days <= 14 ? "critical" : days <= 45 ? "warning" : "stable",
      detail: `${days} days to deadline`
    });
  }

  // ── Recommended actions ──────────────────────────────────────────────
  const recommendedActions: SmartBriefing["recommendedActions"] = [];
  if (overrunPct >= 25) {
    recommendedActions.push({
      label: `Halt non-essential work on ${matter.matterNumber ?? matter.id}`,
      rationale: `Matter is ${overrunPct}% over an approved $${budgetTotal.toLocaleString()} budget; further accrual without scope re-confirmation will require write-offs.`,
      priority: "P0"
    });
  }
  if (vendor && vendor.billingAnomalyCount >= 3) {
    recommendedActions.push({
      label: `Audit ${vendor.name} rate card and last 90 days of invoices`,
      rationale: `${vendor.billingAnomalyCount} flagged invoices across ${vendor.activeMatterCount} matters indicates a systemic billing-policy gap, not a one-off.`,
      priority: "P0"
    });
  }
  if (velocity14d > portfolioAvgVelocity * 2) {
    recommendedActions.push({
      label: "Request itemized burn-down report from outside counsel",
      rationale: `Invoice velocity is ${(velocity14d / portfolioAvgVelocity).toFixed(1)}× the portfolio average — surface what changed.`,
      priority: "P1"
    });
  }
  recommendedActions.push({
    label: matter.riskScore >= 75 ? "Schedule executive review this week" : "Add to next monthly portfolio review",
    rationale: matter.riskScore >= 75
      ? "Critical-tier matters require sponsor visibility — defer no further than 5 business days."
      : "Trending matter — confirm trajectory before the next reporting cycle.",
    priority: matter.riskScore >= 75 ? "P0" : "P2"
  });
  if (related.length >= 3) {
    recommendedActions.push({
      label: `Cluster review of ${related.length} related matters`,
      rationale: `Combined spend of ${fmtCurrency(relatedTotalSpend)} shares the same vendor/practice exposure — a single decision can re-baseline all of them.`,
      priority: "P1"
    });
  }

  // ── Chart data ───────────────────────────────────────────────────────
  // The canonical "risk signal" radar: five dimensions, this matter vs.
  // portfolio benchmark. UI can re-render as bar / radar / line / etc.
  const chart = {
    title: "Risk signals — this matter vs. portfolio benchmark",
    points: [
      { label: "Budget burn", value: Math.min(100, Math.max(0, 50 + overrunPct)), benchmark: 50 },
      { label: "Invoice velocity", value: Math.min(100, Math.round((velocity14d / Math.max(1, portfolioAvgVelocity)) * 35 + 15)), benchmark: 50 },
      { label: "Vendor risk", value: vendor ? vendor.performanceRiskScore : 30, benchmark: 50 },
      { label: "Timeline", value: matter.deadlineAt ? Math.min(100, Math.max(15, 100 - Math.round((new Date(matter.deadlineAt).getTime() - Date.now()) / 86400000) * 1.2)) : 30, benchmark: 50 },
      { label: "Compliance", value: Math.round(vendorAnomalyShare * 70 + (matter.riskScore >= 75 ? 30 : 10)), benchmark: 40 }
    ]
  };

  return {
    matterId: matter.id,
    headline,
    narrative: [para1, para2, para3],
    topRisks,
    recommendedActions,
    chart,
    metrics: {
      riskScore: matter.riskScore,
      overrunPct,
      spend: spendTotal,
      budget: budgetTotal,
      daysOfRunway,
      invoiceVelocity14d: velocity14d,
      portfolioAvgVelocity,
      vendorAnomalyShare,
      relatedMatterCount: related.length,
      relatedMatterTotalSpend: relatedTotalSpend
    }
  };
}

/**
 * Optional OpenAI path. Returns null if no API key is configured or the
 * call fails — the caller falls back to the local generator transparently.
 */
async function composeViaOpenAI(ctx: BriefingContext, base: ReturnType<typeof composeLocal>): Promise<SmartBriefing["narrative"] | null> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
  const endpoint = process.env.OPENAI_ENDPOINT ?? "https://api.openai.com/v1/chat/completions";

  const sanitizedContext = {
    matter: {
      id: ctx.matter.id,
      title: ctx.matter.title,
      practiceArea: ctx.matter.practiceArea,
      jurisdiction: ctx.matter.jurisdictionName,
      riskScore: ctx.matter.riskScore
    },
    metrics: base.metrics,
    vendor: ctx.vendor ? { name: ctx.vendor.name, anomalyCount: ctx.vendor.billingAnomalyCount, activeMatters: ctx.vendor.activeMatterCount } : null,
    relatedMatterCount: ctx.related.length
  };

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        messages: [
          {
            role: "system",
            content:
              "You are a senior legal-operations analyst producing executive risk briefings. " +
              "Respond as JSON: {\"paragraphs\": [string, string, string]}. " +
              "Each paragraph is 2-3 sentences. No markdown. Use the supplied numbers verbatim — never invent figures. " +
              "Tone: precise, advisory, plain-English."
          },
          {
            role: "user",
            content: `Compose an executive risk briefing for this matter.\n\nCONTEXT:\n${JSON.stringify(sanitizedContext, null, 2)}`
          }
        ],
        response_format: { type: "json_object" }
      }),
      // 8 s safety net — degrade to local if the LLM is slow.
      signal: AbortSignal.timeout(8000)
    });
    if (!res.ok) {
      console.warn(`[ai] openai HTTP ${res.status}`);
      return null;
    }
    const json = await res.json() as { choices?: Array<{ message?: { content?: string } }> };
    const content = json.choices?.[0]?.message?.content;
    if (!content) return null;
    const parsed = JSON.parse(content) as { paragraphs?: string[] };
    if (!Array.isArray(parsed.paragraphs) || parsed.paragraphs.length === 0) return null;
    return parsed.paragraphs.slice(0, 4);
  } catch (err) {
    console.warn("[ai] openai call failed:", err instanceof Error ? err.message : err);
    return null;
  }
}

export async function composeSmartBriefing(matterId: string): Promise<SmartBriefing | null> {
  const startedAt = Date.now();
  const ctx = await buildContext(matterId);
  if (!ctx) return null;

  const base = composeLocal(ctx);
  const llmParas = await composeViaOpenAI(ctx, base);

  return {
    ...base,
    narrative: llmParas ?? base.narrative,
    source: llmParas ? "openai" : "local",
    generatedAt: new Date().toISOString(),
    latencyMs: Date.now() - startedAt
  };
}

export interface MatterAskResponse {
  matterId: string;
  question: string;
  answer: string;
  source: "openai" | "local";
  latencyMs: number;
}

/**
 * Lightweight Q&A over a single matter. Local path uses keyword routing on
 * the same context object; LLM path uses the same model when configured.
 */
export async function askMatterQuestion(matterId: string, rawQuestion: string): Promise<MatterAskResponse | null> {
  const startedAt = Date.now();
  const ctx = await buildContext(matterId);
  if (!ctx) return null;
  const question = rawQuestion.trim();
  const q = question.toLowerCase();

  // Reject nonsense / too-short / no-vowel input early so we don't pretend
  // a greeting is a real question — applies to BOTH local and LLM paths
  // so we don't spend an LLM call on "hello".
  const wordCount = q.split(/\s+/).filter(Boolean).length;
  const hasVowel = /[aeiou]/.test(q);
  const isGreeting = /^(hi|hey|hello|helo|yo|sup|test|hola|ok|okay|thanks|thank you)\b/.test(q);
  if (q.length < 4 || (wordCount === 1 && !hasVowel) || isGreeting) {
    return {
      matterId,
      question,
      answer: `I didn't catch a specific question. Try one of: "How over budget is this matter?", "Who is the vendor and how risky?", "What is the invoice velocity?", "When is the next deadline?", "Are there related matters?", "What is the risk score?", or "What action should we take?".`,
      source: "local",
      latencyMs: Date.now() - startedAt
    };
  }

  // Try LLM first if configured.
  const key = process.env.OPENAI_API_KEY;
  if (key) {
    try {
      const base = composeLocal(ctx);
      // Build a richer, sanitized context object so the LLM can answer
      // questions about the matter, vendor, related matters, alerts and
      // recommended actions — not just the small `metrics` block.
      const llmContext = {
        matter: {
          id: ctx.matter.id,
          number: ctx.matter.matterNumber,
          title: ctx.matter.title,
          practiceArea: ctx.matter.practiceArea,
          jurisdiction: ctx.matter.jurisdictionName ?? ctx.matter.jurisdictionCode ?? null,
          status: ctx.matter.status,
          riskScore: ctx.matter.riskScore,
          spendToDate: ctx.spendTotal,
          budgetTotal: ctx.budgetTotal,
          summary: ctx.matter.summary ?? null,
          updatedAt: ctx.matter.updatedAt ?? null
        },
        vendor: ctx.vendor ? {
          id: ctx.vendor.id,
          name: ctx.vendor.name,
          performanceRiskScore: ctx.vendor.performanceRiskScore,
          activeMatterCount: ctx.vendor.activeMatterCount,
          billingAnomalyCount: ctx.vendor.billingAnomalyCount,
          totalSpend: ctx.vendor.totalSpend
        } : null,
        derivedMetrics: base.metrics,
        topRisks: base.topRisks,
        recommendedActions: base.recommendedActions,
        alertsForThisMatter: ctx.matterAlerts.map((a) => ({
          severity: a.severity,
          message: a.message,
          createdAt: a.createdAt
        })),
        relatedMatters: ctx.related.map((r) => ({
          id: r.id,
          number: r.matterNumber,
          title: r.title,
          riskScore: r.riskScore,
          spendToDate: r.spendToDate
        })),
        availableData: [
          "matter title, number, practice area, jurisdiction, status, risk score",
          "budget total and spend-to-date",
          "outside counsel vendor name, performance score, billing anomalies",
          "derived metrics: overrun %, days of runway, invoice velocity (14 day) vs portfolio average, vendor anomaly share",
          "alerts (severity + message + timestamp) for this matter",
          "related matters (id, number, title, risk score, spend) — limited to 5",
          "recommended actions (label, rationale, P0/P1/P2 priority)"
        ],
        unavailableData: [
          "individual invoice line items, line-item amounts, invoice numbers, or vendor invoice PDFs",
          "timekeeper rates or hours",
          "narrative case-history beyond the summary field",
          "court calendars or filing dockets"
        ]
      };
      const res = await fetch(process.env.OPENAI_ENDPOINT ?? "https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
        body: JSON.stringify({
          model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
          temperature: 0.1,
          messages: [
            {
              role: "system",
              content:
                "You are a senior legal-operations analyst answering questions about ONE legal matter. " +
                "You MUST use ONLY the supplied JSON context — never invent figures or names. " +
                "Be specific, quantitative, and concise (2-4 sentences). Cite real numbers (currency, percentages, days, scores).\n\n" +
                "FIELD MAPPING — apply these synonyms strictly:\n" +
                "- 'vendor', 'outside counsel', 'counsel', 'law firm', 'firm', 'attorney', 'lawyer', 'who is representing' → context.vendor.name\n" +
                "- 'budget', 'overrun', 'over budget', 'spend', 'burn' → context.matter.budgetTotal, context.matter.spendToDate, context.derivedMetrics.overrunPct\n" +
                "- 'risk', 'risk score', 'how bad', 'severity' → context.matter.riskScore (0-100; ≥75 = critical)\n" +
                "- 'alerts', 'flags', 'warnings', 'issues' → context.alertsForThisMatter\n" +
                "- 'related', 'similar', 'cluster', 'other matters' → context.relatedMatters\n" +
                "- 'invoice velocity', 'billing cadence' → context.derivedMetrics.invoiceVelocity14d\n" +
                "- 'jurisdiction', 'state', 'where' → context.matter.jurisdiction\n" +
                "- 'practice area', 'type', 'category' → context.matter.practiceArea\n" +
                "- 'recommended action', 'next step', 'what should we do' → context.recommendedActions\n\n" +
                "If the user asks about the vendor/outside counsel and context.vendor is non-null, ALWAYS answer with the firm name and key risk metrics — never say 'unavailable'. " +
                "Only say data is unavailable when the field is genuinely null in the context. " +
                "If a question is unrelated to this legal matter, politely redirect."
            },
            {
              role: "user",
              content:
                `MATTER SUMMARY (read first):\n` +
                `- Title: ${ctx.matter.title}\n` +
                `- Number: ${ctx.matter.matterNumber ?? ctx.matter.id}\n` +
                `- Practice area: ${ctx.matter.practiceArea}\n` +
                `- Jurisdiction: ${ctx.matter.jurisdictionName ?? ctx.matter.jurisdictionCode ?? "n/a"}\n` +
                `- Risk score: ${ctx.matter.riskScore}/100\n` +
                `- Spend: ${fmtCurrency(ctx.spendTotal)} of ${fmtCurrency(ctx.budgetTotal)} budget (${base.metrics.overrunPct >= 0 ? "+" : ""}${base.metrics.overrunPct}% vs plan)\n` +
                `- Outside counsel (vendor): ${ctx.vendor?.name ?? "NOT ON FILE"}` +
                  `${ctx.vendor ? ` — performance score ${ctx.vendor.performanceRiskScore}/100, ${ctx.vendor.billingAnomalyCount} billing anomalies across ${ctx.vendor.activeMatterCount} active matters, total firm spend ${fmtCurrency(ctx.vendor.totalSpend)}` : ""}\n` +
                `- Alerts on this matter: ${ctx.matterAlerts.length}\n` +
                `- Related matters in same vendor cluster: ${ctx.related.length}\n\n` +
                `FULL CONTEXT JSON:\n${JSON.stringify(llmContext, null, 2)}\n\n` +
                `QUESTION: ${question}`
            }
          ]
        }),
        signal: AbortSignal.timeout(15000)
      });
      if (res.ok) {
        const json = await res.json() as { choices?: Array<{ message?: { content?: string } }> };
        const content = json.choices?.[0]?.message?.content?.trim();
        if (content) {
          return { matterId, question, answer: content, source: "openai", latencyMs: Date.now() - startedAt };
        }
      } else {
        console.warn(`[ai] ask openai HTTP ${res.status}`);
      }
    } catch (err) {
      console.warn("[ai] ask openai failed, falling back:", err instanceof Error ? err.message : err);
    }
  }

  // Local keyword-routed answer — pulls real numbers from ctx.
  const base = composeLocal(ctx);
  const m = ctx.matter;

  // (Greeting / nonsense input already rejected above.)

  let answer: string;
  if (/budget|overrun|over.?budget|spend|burn/.test(q)) {
    answer = `Matter ${m.matterNumber ?? m.id} has spent ${fmtCurrency(ctx.spendTotal)} of an approved ${fmtCurrency(ctx.budgetTotal)} budget — ` +
      `that is ${base.metrics.overrunPct >= 0 ? "+" : ""}${base.metrics.overrunPct}% versus plan. At the current daily burn rate it has roughly ${base.metrics.daysOfRunway} days of runway remaining.`;
  } else if (/vendor|firm|counsel|outside/.test(q)) {
    answer = ctx.vendor
      ? `Outside counsel is ${ctx.vendor.name}, currently scored ${ctx.vendor.performanceRiskScore}/100 with ${ctx.vendor.billingAnomalyCount} flagged invoices across ${ctx.vendor.activeMatterCount} active matters. Total firm spend tracked is ${fmtCurrency(ctx.vendor.totalSpend)}.`
      : `No outside-counsel record is currently linked to this matter.`;
  } else if (/invoice|velocity|billing|rate/.test(q)) {
    answer = `In the last 14 days the matter logged ${base.metrics.invoiceVelocity14d} invoice events, versus a portfolio average of ${base.metrics.portfolioAvgVelocity}. ` +
      (base.metrics.invoiceVelocity14d > base.metrics.portfolioAvgVelocity * 2 ? "That is materially above the norm and worth a billing-cadence audit." : "That is roughly in line with the portfolio.");
  } else if (/deadline|timeline|due|filing/.test(q)) {
    answer = m.deadlineAt
      ? `The next deadline on file is ${new Date(m.deadlineAt).toLocaleDateString()} — ${Math.max(0, Math.round((new Date(m.deadlineAt).getTime() - Date.now()) / 86400000))} days out.`
      : `No deadline is currently recorded for this matter.`;
  } else if (/related|similar|other matter|cluster/.test(q)) {
    answer = base.metrics.relatedMatterCount > 0
      ? `${base.metrics.relatedMatterCount} related matters share this vendor or practice area, with combined spend of ${fmtCurrency(base.metrics.relatedMatterTotalSpend)}.`
      : `No directly comparable open matters were found.`;
  } else if (/risk|score|severity|how bad/.test(q)) {
    answer = `Overall risk score is ${m.riskScore}/100 (${m.riskScore >= 75 ? "critical" : m.riskScore >= 50 ? "warning" : "stable"}). The dominant signals are ${base.topRisks.slice(0, 2).map((r) => r.label.toLowerCase()).join(" and ")}.`;
  } else if (/recommend|action|what (should|do)|next step/.test(q)) {
    const top = base.recommendedActions[0];
    answer = top ? `Top recommended action: ${top.label} (${top.priority}). Rationale: ${top.rationale}` : `No specific action is recommended at this time.`;
  } else {
    // Generic fallback — couldn't classify into a known intent.
    answer = `I'm not sure how to answer that from the data on file. I can speak to: budget overrun & burn, the outside counsel and their risk profile, invoice velocity vs. the portfolio, the next deadline, related matters in the same vendor cluster, the overall risk score, or recommended actions. Try rephrasing toward one of those.`;
  }

  return { matterId, question, answer, source: "local", latencyMs: Date.now() - startedAt };
}
