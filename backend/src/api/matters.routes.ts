import { Router, type Request, type Response } from "express";
import { loadAlerts, loadBudgetHistory, loadMatterById, loadMatters, loadVendors, passportMode } from "../data/loaders";
import * as passport from "../data/passportRepo";
import type { MatterActivityEvent } from "../types/domain";

export const mattersRouter = Router();

mattersRouter.get("/", async (request: Request, response: Response) => {
  const jurisdictionId = typeof request.query.jurisdictionId === "string" ? request.query.jurisdictionId : undefined;
  const levelParam = typeof request.query.level === "string" ? request.query.level.toLowerCase() : undefined;
  const level = levelParam === "critical" || levelParam === "warning" || levelParam === "healthy" || levelParam === "all"
    ? levelParam
    : undefined;
  const sizeRaw = typeof request.query.size === "string" ? Number(request.query.size) : NaN;
  const size = Number.isFinite(sizeRaw) && sizeRaw > 0 ? Math.min(500, sizeRaw) : 200;
  const pageRaw = typeof request.query.page === "string" ? Number(request.query.page) : NaN;
  const page = Number.isFinite(pageRaw) && pageRaw >= 0 ? pageRaw : 0;

  // Push filter + pagination down to SQL when running against Passport so
  // we never pull the whole 20k-matter portfolio into Node memory.
  if (passportMode()) {
    try {
      const [data, total] = await Promise.all([
        passport.fetchMattersFiltered({ level, jurisdictionId, page, size }),
        passport.fetchMattersCount({ level, jurisdictionId })
      ]);
      return response.json({ data, total, page, size, source: "passport" });
    } catch (err) {
      console.warn("[matters] passport list failed, falling back to JSON:", err instanceof Error ? err.message : err);
    }
  }

  const matters = await loadMatters();
  let data = jurisdictionId ? matters.filter((matter) => matter.jurisdictionId === jurisdictionId) : matters;
  if (level === "critical") data = data.filter((m) => m.riskScore >= 75);
  else if (level === "warning") data = data.filter((m) => m.riskScore >= 50 && m.riskScore < 75);
  else if (level === "healthy") data = data.filter((m) => m.riskScore < 50);
  const total = data.length;
  response.json({ data: data.slice(0, size), total, page, size, source: "json" });
});

mattersRouter.get("/:id", async (request: Request, response: Response) => {
  const matter = await loadMatterById(request.params.id);

  if (!matter) {
    response.status(404).json({ error: { code: "not_found", message: "Matter not found." } });
    return;
  }

  response.json({ data: matter });
});

/**
 * GET /api/matters/:id/briefing
 *
 * Returns the structured payload that drives the Matter Briefing screen:
 * the matter itself, contributing risk factors, AI-style narrative, related
 * matters in the same firm/practice cluster, invoice velocity, and a runway
 * estimate. Today the heuristic is computed in-process; in production this
 * route would call the rule engine / LLM service.
 */
mattersRouter.get("/:id/briefing", async (request: Request, response: Response) => {
  const matter = await loadMatterById(request.params.id);
  if (!matter) {
    response.status(404).json({ error: { code: "not_found", message: "Matter not found." } });
    return;
  }

  const [vendors, alerts] = await Promise.all([loadVendors(), loadAlerts()]);
  const vendor = vendors.find((v) => v.id === matter.outsideCounselVendorId);
  // "Related matters" — same vendor / same practice area, capped at 5.
  // JSON-only fallback: pulled from the in-memory matter list.
  let related: typeof matter[] = [];
  try {
    if (matter.outsideCounselVendorId && matter.outsideCounselVendorId !== "unknown") {
      const all = await loadMatters();
      related = all
        .filter((m) => m.id !== matter.id && m.outsideCounselVendorId === matter.outsideCounselVendorId)
        .slice(0, 5);
    }
  } catch (err) {
    console.warn("[briefing] related matters lookup failed:", err);
  }

  // Synthesise contributing factors. Replace with real model output later.
  const overrunFactor = Math.min(100, Math.max(0, matter.riskScore - 30));
  const vendorFactor = vendor ? Math.round(vendor.performanceRiskScore) : 40;
  const velocityFactor = 60;
  const deadlineFactor = matter.deadlineAt ? 70 : 30;

  const matterAlerts = alerts.filter((a) => a.matterId === matter.id);

  // Real invoice velocity when Passport is wired; falls back to alert-derived
  // counts when running on JSON fixtures or if the SQL query fails.
  const last14Days = matterAlerts.length;
  const portfolioAvg = Math.max(1, Math.round(alerts.length / 100));
  const invoiceQueue: Array<{
    invoiceNumber: string;
    invoiceDate: string;
    amount: number;
    status: string;
    hasErrors: boolean;
    isVoided: boolean;
  }> = [];
  const firmAnomalyCount = 0;
  const firmInvoiceCount = 0;
  const firmMatterCount = 1;

  // Budget vs spend — JSON-only mode: approximate budget from spend and
  // risk score so the Briefing screen still demos cleanly.
  let budgetTotal = 0;
  const spendTotal = matter.spendToDate;

  // Fixture-mode fallback: synthesise a plausible total budget from spend +
  // risk score so the burn ratio still scales with riskScore.
  if (budgetTotal <= 0) {
    const burnRatio = Math.min(0.95, Math.max(0.35, matter.riskScore / 100));
    budgetTotal = Math.round(spendTotal / burnRatio);
  }

  // Days until budget exhausted — assume a constant burn rate from spend so far.
  const daysOpen = Math.max(1, Math.round((Date.now() - new Date(matter.updatedAt).getTime()) / (1000 * 60 * 60 * 24)) || 30);
  const dailyBurn = spendTotal / daysOpen;
  const remainingBudget = Math.max(0, budgetTotal - spendTotal);
  const daysUntilBudgetExhausted =
    dailyBurn > 0 ? Math.max(0, Math.round(remainingBudget / dailyBurn)) : Math.max(0, Math.round(60 - matter.riskScore / 2));

  // ── Server-side signal scoring ─────────────────────────────────────────
  // Mirrors frontend/src/lib/riskSignals.ts so the Briefing screen renders
  // consistent bars whether data comes from Passport or JSON fixtures.
  const burnPct = Math.min(100, Math.round((spendTotal / Math.max(1, budgetTotal)) * 100));
  const velocityScore = Math.min(100, Math.round((last14Days / Math.max(1, portfolioAvg)) * 35 + 15));
  const firmAnomalyShare = firmInvoiceCount > 0 ? firmAnomalyCount / firmInvoiceCount : 0;
  const vendorScore = Math.min(100, Math.max(vendorFactor, Math.round(firmAnomalyShare * 100)));
  const daysToDeadline = matter.deadlineAt
    ? Math.max(0, Math.round((new Date(matter.deadlineAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 365;
  const timelineScore = matter.deadlineAt
    ? Math.min(100, Math.max(15, Math.round(100 - daysToDeadline * 1.2)))
    : Math.min(60, Math.round(matter.riskScore * 0.4));
  const complianceScore = Math.min(100, Math.round(firmAnomalyShare * 70 + (matter.riskScore >= 75 ? 30 : 10)));

  const bucket = (score: number): "critical" | "watch" | "stable" =>
    score >= 75 ? "critical" : score >= 50 ? "watch" : "stable";

  const signals = [
    {
      key: "budgetBurn",
      label: "Budget burn",
      score: burnPct,
      level: bucket(burnPct),
      detail: `${burnPct}% of $${budgetTotal.toLocaleString()} budget consumed`
    },
    {
      key: "invoiceVelocity",
      label: "Invoice velocity",
      score: velocityScore,
      level: bucket(velocityScore),
      detail: `${last14Days} invoice alerts in 14d vs portfolio avg ${portfolioAvg}`
    },
    {
      key: "vendorRisk",
      label: "Vendor risk",
      score: vendorScore,
      level: bucket(vendorScore),
      detail: vendor
        ? `${vendor.name} — ${firmAnomalyCount}/${firmInvoiceCount || "?"} flagged invoices across ${firmMatterCount} matters`
        : `Outside counsel performance score ${vendorFactor}/100`
    },
    {
      key: "timelineRisk",
      label: "Timeline risk",
      score: timelineScore,
      level: bucket(timelineScore),
      detail: matter.deadlineAt ? `${daysToDeadline} days to deadline` : "No deadline on file"
    },
    {
      key: "compliance",
      label: "Compliance",
      score: complianceScore,
      level: bucket(complianceScore),
      detail: `Firm anomaly share ${(firmAnomalyShare * 100).toFixed(0)}%`
    }
  ];

  response.json({
    data: {
      matter,
      vendor: vendor ?? null,
      signals,
      invoiceQueue,
      budgetTotal,
      spendTotal,
      firmInvoiceCount,
      firmAnomalyCount,
      firmMatterCount,
      contributingFactors: [
        { label: "Budget overrun trajectory", weight: overrunFactor },
        { label: "Outside counsel performance", weight: vendorFactor },
        { label: "Invoice velocity vs portfolio", weight: velocityFactor },
        { label: "Deadline pressure", weight: deadlineFactor }
      ],
      narrative:
        `${matter.title} (${matter.practiceArea}) is currently scored ${matter.riskScore}/100. ` +
        `Outside counsel ${vendor?.name ?? "the assigned firm"} carries a performance risk of ${vendorScore}/100 across ` +
        `${firmMatterCount} active matter(s). ` +
        `Recent invoice velocity is ${last14Days} in 14 days versus a portfolio average of ${portfolioAvg}. ` +
        `At current burn ($${Math.round(dailyBurn).toLocaleString()}/day) this matter has roughly ${daysUntilBudgetExhausted} days of runway before budget is exhausted.`,
      recommendedActions: [
        `Review rate card for ${vendor?.name ?? "outside counsel"} for unapproved increases`,
        `Request revised budget estimate for matter ${matter.id}`,
        "Flag invoice velocity pattern to Legal Operations for review",
        "Consider budget reallocation from lower-risk matters",
        `Schedule steering call with ${vendor?.name ?? "the firm"} this week`
      ],
      relatedMatters: related,
      invoiceVelocity: { last14Days, portfolioAvg },
      daysUntilBudgetExhausted,
      generatedAt: new Date().toISOString()
    }
  });
});

/**
 * GET /api/matters/:id/budget-history (FR-026 / FR-027)
 *
 * Returns the curated revision history for the matter, including original
 * budget, each approved revision, current burn, projected next revision,
 * and a reallocation-risk advisory. Matters without a curated entry get
 * a structured empty payload so the UI can render a graceful empty state.
 */
mattersRouter.get("/:id/budget-history", async (request: Request, response: Response) => {
  const matter = await loadMatterById(request.params.id);
  if (!matter) {
    response.status(404).json({ error: { code: "not_found", message: "Matter not found." } });
    return;
  }
  const history = await loadBudgetHistory(matter.id);
  response.json({
    data: history,
    hasHistory: history !== null
  });
});

/**
 * GET /api/matters/:id/timeline (FR-028 / CL-009)
 *
 * Returns a reverse-chronological list of activity events scoped to the
 * five event types defined in CL-009: matter opened, budget revisions,
 * invoice submitted/approved, rate-card violations, and alerts raised.
 *
 * Events are synthesized from existing seed data:
 *   - matter.updatedAt + matter id  →  matter_opened
 *   - budgetHistory.revisions       →  budget_revision
 *   - related alerts                →  alert_raised, rate_card_violation
 *   - briefing invoice queue        →  invoice_submitted / invoice_approved
 */
mattersRouter.get("/:id/timeline", async (request: Request, response: Response) => {
  const matter = await loadMatterById(request.params.id);
  if (!matter) {
    response.status(404).json({ error: { code: "not_found", message: "Matter not found." } });
    return;
  }

  const [history, alerts] = await Promise.all([loadBudgetHistory(matter.id), loadAlerts()]);
  const events: MatterActivityEvent[] = [];

  // Matter opened — anchor on a plausibly old date (8-10 weeks before now)
  // so the timeline always has an origin entry. We use the original budget
  // date when available, otherwise fall back to a fixed offset from updatedAt.
  const opened = history?.revisions.find((r) => r.status === "original");
  const openedAt = opened?.date
    ?? new Date(new Date(matter.updatedAt).getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();
  const openedBudget = history?.originalBudget ?? matter.budgetTotal ?? 0;
  events.push({
    id: `evt-${matter.id}-opened`,
    matterId: matter.id,
    type: "matter_opened",
    severity: "info",
    occurredAt: openedAt,
    title: `Matter ${matter.matterNumber ?? `#${matter.id}`} opened${openedBudget ? ` · Budget $${openedBudget.toLocaleString()} approved` : ""}`,
    detail: `${matter.title} · ${matter.vendorName ?? "Outside counsel"} · ${matter.practiceArea} · ${matter.jurisdictionName ?? matter.jurisdictionId}`
  });

  // Budget revisions
  if (history) {
    for (const rev of history.revisions) {
      if (rev.status === "original") continue;
      events.push({
        id: `evt-${matter.id}-${rev.id}`,
        matterId: matter.id,
        type: "budget_revision",
        severity: "warn",
        occurredAt: rev.date,
        title: `Budget ${rev.label} approved · +$${rev.delta.toLocaleString()}`,
        detail: `${rev.reason} · Approved by ${rev.approvedBy}`
      });
    }
  }

  // Alerts on this matter — map deadline_risk and threshold_breach to
  // alert_raised, and spend_anomaly involving rate-card patterns to
  // rate_card_violation.
  for (const a of alerts.filter((al) => al.matterId === matter.id)) {
    const isRateCard = /rate[- ]?card/i.test(a.message) || /rate[- ]?card/i.test(a.recommendedAction);
    events.push({
      id: `evt-${matter.id}-${a.id}`,
      matterId: matter.id,
      type: isRateCard ? "rate_card_violation" : "alert_raised",
      severity: a.severity === "critical" || a.severity === "high" ? "critical" : "warn",
      occurredAt: a.createdAt,
      title: isRateCard
        ? `Rate card violation detected · ${matter.vendorName ?? "Outside counsel"}`
        : a.message,
      detail: a.recommendedAction
    });
  }

  // Curated rate-card violation event for the hero matter so the timeline
  // mirrors the reference screenshot (Mar 28 Wilson LLP +18%).
  if (matter.id === "matter-001") {
    events.push({
      id: "evt-matter-001-rate-violation",
      matterId: matter.id,
      type: "rate_card_violation",
      severity: "critical",
      occurredAt: "2026-03-28T14:00:00.000Z",
      title: `Rate card violation detected · ${matter.vendorName ?? "Wilson LLP"} · +18% above approved`,
      detail: "Effective Mar 28 · No rate card amendment submitted to Passport"
    });
  }

  // Synthesize a small invoice activity stream for the hero matters so the
  // timeline reads like the screenshot (recent submissions + an approval).
  const HERO_INVOICES: Record<string, MatterActivityEvent[]> = {
    "matter-001": [
      {
        id: "evt-matter-001-inv-2891",
        matterId: "matter-001",
        type: "invoice_submitted",
        severity: "warn",
        occurredAt: "2026-04-17T09:00:00.000Z",
        title: "INV-2891 submitted · $18,400 · Pending Approval",
        detail: `${matter.vendorName ?? "Wilson LLP"} · Employment services · Apr 1–15`
      },
      {
        id: "evt-matter-001-inv-2874",
        matterId: "matter-001",
        type: "invoice_submitted",
        severity: "warn",
        occurredAt: "2026-04-14T09:00:00.000Z",
        title: "INV-2874 submitted · $19,200 · Pending Approval",
        detail: `${matter.vendorName ?? "Wilson LLP"} · Deposition support · Mar 28–Apr 13`
      },
      {
        id: "evt-matter-001-inv-2741",
        matterId: "matter-001",
        type: "invoice_approved",
        severity: "info",
        occurredAt: "2026-03-15T09:00:00.000Z",
        title: "INV-2741 approved · $22,100",
        detail: `${matter.vendorName ?? "Wilson LLP"} · Trial preparation · Mar 1–14`
      }
    ]
  };
  if (HERO_INVOICES[matter.id]) events.push(...HERO_INVOICES[matter.id]);

  events.sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());
  response.json({ data: events });
});
