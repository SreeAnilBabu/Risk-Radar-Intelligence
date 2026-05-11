/**
 * matterRecommendedActions.ts — deterministic Recommended Actions builder
 * for the Matter Detail page (FR-029 / CL-010).
 *
 * Demo-narrative matters get a curated override list (so the hero matter
 * #1042 always reads exactly like the screenshot). All other matters fall
 * back to a small rules engine that derives a prioritized list from the
 * matter's signals (rate-card violations, projected budget revisions,
 * cluster exposure, pending invoices).
 *
 * Returned actions are ordered by priority. Checkbox completion state is
 * intentionally NOT modeled here — that lives in component state and is
 * never persisted.
 */
import type { MatterActivityEvent, MatterBudgetHistory, MatterRiskRecord } from "../types/domain";

export interface RecommendedAction {
  id: string;
  text: string;
  priority: number;
}

/** Curated action lists for demo-narrative matters. The hero matter #1042
 *  matches the reference screenshot 1:1. */
const CURATED: Record<string, string[]> = {
  "matter-001": [
    "Resolve Wilson LLP rate card violation in Passport before approving any further budget reallocation",
    "Place spend hold on pending INV-4421 — do not approve until rate card is resolved",
    "Request itemised scope justification from Wilson LLP before approving a 3rd budget revision",
    "Evaluate reallocation from a lower-priority matter (Monitor quadrant) to cover CA cluster exposure",
    "Escalate to General Counsel if total exposure across CA Employment cluster exceeds $750K",
    "Notify Brian (Legal Bill Reviewer) to hold all pending Wilson LLP invoices across the portfolio"
  ],
  "matter-002": [
    "Confirm arbitrator panel selection is on track for the May 3 deadline",
    "Request line-item discovery cost breakdown from Summit & Hale",
    "Schedule legal-ops touchpoint to review remaining $53K runway",
    "Document arbitration strategy decision in matter notes"
  ],
  "matter-003": [
    "Confirm 3-year lookback document production is on schedule for May 25",
    "Verify NY DOL response is signed off by general counsel",
    "Request weekly status from Harbor Legal Group until production closes",
    "Document audit response strategy in matter notes"
  ]
};

interface BuildInput {
  matter: MatterRiskRecord;
  budgetHistory: MatterBudgetHistory | null;
  timeline: MatterActivityEvent[];
  pendingInvoiceCount: number;
}

/** Derive an ordered Recommended Actions list. Curated overrides win when
 *  present; otherwise the deterministic rules engine generates entries. */
export function buildRecommendedActions(input: BuildInput): RecommendedAction[] {
  const { matter, budgetHistory, timeline, pendingInvoiceCount } = input;

  const curated = CURATED[matter.id];
  if (curated) {
    return curated.map((text, index) => ({
      id: `${matter.id}-curated-${index}`,
      text,
      priority: index + 1
    }));
  }

  const out: RecommendedAction[] = [];
  let priority = 1;
  const push = (text: string) => {
    out.push({ id: `${matter.id}-r${priority}`, text, priority });
    priority++;
  };

  // Rule 1 — rate-card violation in the timeline is the highest priority.
  const hasRateCard = timeline.some((e) => e.type === "rate_card_violation");
  if (hasRateCard) {
    push(`Resolve ${matter.vendorName ?? "outside counsel"} rate card violation in Passport before approving further reallocation`);
  }

  // Rule 2 — projected next budget revision triggers a scope-justification ask.
  if (budgetHistory?.projectedNextRevisionAt && budgetHistory.reallocationRiskLevel !== "low") {
    push(`Request itemised scope justification from ${matter.vendorName ?? "outside counsel"} before approving a ${budgetHistory.revisions.length + 1}${ordinalSuffix(budgetHistory.revisions.length + 1)} budget revision`);
  }

  // Rule 3 — pending invoices while spend is critical → spend hold.
  if (pendingInvoiceCount > 0 && matter.riskScore >= 75) {
    push(`Place spend hold on ${pendingInvoiceCount} pending invoice${pendingInvoiceCount > 1 ? "s" : ""} until budget posture is reviewed`);
  }

  // Rule 4 — high-exposure cluster → reallocation evaluation.
  if (matter.riskScore >= 75) {
    push(`Evaluate reallocation from a lower-priority matter to cover ${matter.jurisdictionName ?? matter.jurisdictionId} ${matter.practiceArea} exposure`);
  }

  // Rule 5 — critical risk → GC escalation.
  if (matter.riskScore >= 85) {
    push("Escalate to General Counsel if cluster exposure exceeds the executive threshold");
  }

  // Always-on close-out action so the card is never empty.
  push("Document action taken in matter notes");

  return out;
}

function ordinalSuffix(n: number): string {
  const v = n % 100;
  if (v >= 11 && v <= 13) return "th";
  switch (n % 10) {
    case 1: return "st";
    case 2: return "nd";
    case 3: return "rd";
    default: return "th";
  }
}
