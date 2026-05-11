/**
 * recommendedActions.ts — generates the persona × signal-score matrix that
 * powers the "Recommended Actions" card on the Briefing screen.
 *
 * Why a templated set instead of free-form text:
 *   * Each persona only sees actions they have authority to take.
 *   * Each signal contributes its own block, but only when its score is at
 *     least Watch level (≥ 50). This keeps the checklist focused on the
 *     specific problems showing on this matter rather than a generic list.
 *   * Stable always-shown actions are persona-specific too (escalation,
 *     documentation), so the section is never empty.
 *
 * Returned `kind` distinguishes Brian/May checkboxes from John's read-only
 * advisory prompts (the BRD calls for non-actionable language for the GC).
 */
import type { SignalBundle, SignalScore } from "./riskSignals";
import type { UserRole } from "./userRole";
import type { PassportMatter } from "../data/passportSeed";

export type ActionKind = "checkbox" | "advisory";

export interface ActionBlock {
  trigger: string; // e.g. "Budget Burn — Critical"
  tone: "red" | "amber" | "blue";
  items: string[];
}

export interface ActionPlan {
  kind: ActionKind;
  blocks: ActionBlock[];
  emptyMessage?: string;
}

const trigger = (sig: SignalScore) =>
  `${sig.label} — ${sig.level === "critical" ? "Critical" : sig.level === "watch" ? "Watch" : "Stable"}`;

const tone = (sig: SignalScore) => (sig.level === "critical" ? "red" : "amber");

/* ────────────────────────────────────────────────────────────────────────
 * Legal Ops Director (May) — RISKRADAR_FULL_ACCESS
 * ──────────────────────────────────────────────────────────────────────── */
function legalOpsActions(matter: PassportMatter, bundle: SignalBundle): ActionPlan {
  const blocks: ActionBlock[] = [];
  const firm = matter.firm;
  const id = matter.id;

  for (const sig of bundle.signals) {
    if (sig.level === "stable") continue;
    const items: string[] = [];
    switch (sig.key) {
      case "budgetBurn":
        items.push(
          `Request revised budget estimate from ${firm}`,
          "Initiate budget reallocation from a lower-priority matter",
          `Place matter ${id} on spend hold pending review`,
          "Approve emergency budget increase (if authorised)"
        );
        break;
      case "invoiceVelocity":
        items.push(
          "Flag invoice velocity spike to billing team",
          `Place pending ${firm} invoice batch on hold pending investigation`,
          `Request itemised billing breakdown from ${firm}`
        );
        break;
      case "vendorRisk":
        items.push(
          `Review rate card amendment for ${firm}`,
          `Issue formal billing guideline reminder to ${firm}`,
          `Schedule outside counsel steering call with ${firm}`,
          "Initiate rate renegotiation if deviation exceeds threshold"
        );
        break;
      case "timelineRisk":
        items.push(
          "Review matter scope with supervising attorney",
          `Request updated case timeline and expected close date from ${firm}`,
          "Consider alternative or co-counsel"
        );
        break;
      case "compliance":
        items.push(
          `Initiate formal billing guideline audit for ${firm}`,
          `Escalate recurring exceptions to ${firm} relationship partner`
        );
        break;
    }
    if (items.length) blocks.push({ trigger: trigger(sig), tone: tone(sig), items });
  }

  // Always-shown operational close-out actions.
  blocks.push({
    trigger: "Always required",
    tone: "blue",
    items: [
      `Escalate to GC if projected exposure exceeds $${Math.round(matter.budget / 1000) * 2}K`,
      `Notify business unit owner of projected overrun on ${id}`,
      "Document action taken in matter notes"
    ]
  });

  return { kind: "checkbox", blocks };
}

/* ────────────────────────────────────────────────────────────────────────
 * General Counsel (John) — RISKRADAR_EXEC_VIEW
 * ──────────────────────────────────────────────────────────────────────── */
function generalCounselActions(matter: PassportMatter, bundle: SignalBundle): ActionPlan {
  const blocks: ActionBlock[] = [];
  const criticalCount = bundle.signals.filter((s) => s.level === "critical").length;
  const burn = bundle.signals.find((s) => s.key === "budgetBurn");

  if (burn?.level === "critical") {
    blocks.push({
      trigger: "Budget Burn — Critical",
      tone: "red",
      items: [
        "Approve budget reallocation request from Legal Ops",
        "Authorise outside counsel engagement change",
        `Request CFO notification — projected exposure ${Math.round(matter.actual / 1000)}K`
      ]
    });
  }

  if (criticalCount >= 2) {
    blocks.push({
      trigger: "Multiple Critical signals",
      tone: "red",
      items: [
        "Schedule executive briefing with Legal Ops Director",
        "Review cluster risk before next board meeting"
      ]
    });
  }

  blocks.push({
    trigger: "Always required",
    tone: "blue",
    items: [
      "Confirm Legal Ops has been notified",
      `Add ${matter.id} to board risk watch list if projected overrun exceeds executive threshold`
    ]
  });

  if (blocks.length === 1) {
    return {
      kind: "advisory",
      blocks: [],
      emptyMessage: "No executive action required at this time. Legal Ops is monitoring."
    };
  }

  return { kind: "advisory", blocks };
}

/* ────────────────────────────────────────────────────────────────────────
 * Legal Bill Reviewer (Brian) — RISKRADAR_MATTER_VIEW
 * ──────────────────────────────────────────────────────────────────────── */
function billReviewerActions(matter: PassportMatter, bundle: SignalBundle): ActionPlan {
  const blocks: ActionBlock[] = [];
  const firm = matter.firm;
  const burn = bundle.signals.find((s) => s.key === "budgetBurn");
  const vel = bundle.signals.find((s) => s.key === "invoiceVelocity");
  const vend = bundle.signals.find((s) => s.key === "vendorRisk");
  const comp = bundle.signals.find((s) => s.key === "compliance");

  if (burn && burn.level !== "stable") {
    blocks.push({
      trigger: trigger(burn),
      tone: tone(burn),
      items: [
        "Do not approve pending invoices until Legal Ops clears budget status",
        `Flag matter ${matter.id} to Legal Ops before processing next invoice batch`
      ]
    });
  }

  if (vel?.level === "critical") {
    blocks.push({
      trigger: trigger(vel),
      tone: "red",
      items: [
        `Hold all pending invoices from ${firm} for matter ${matter.id}`,
        `Request line-item justification from ${firm} before approving`
      ]
    });
  }

  if (vend && vend.level !== "stable") {
    blocks.push({
      trigger: trigger(vend),
      tone: tone(vend),
      items: [
        "Hold next invoice — do not approve until rate card violation is resolved",
        "Flag rate card violation to Legal Ops",
        'Reject invoice with reason code: "Rate exceeds approved rate card"'
      ]
    });
  }

  if (comp && comp.level !== "stable") {
    blocks.push({
      trigger: trigger(comp),
      tone: tone(comp),
      items: [
        "Apply billing guideline exception flag on invoice",
        "Route invoice to supervising attorney for secondary approval",
        `Hold new invoices from ${firm} until billing guidelines are acknowledged`
      ]
    });
  }

  blocks.push({
    trigger: "Always required",
    tone: "blue",
    items: [
      "Escalate matter to Legal Ops if multiple signals are Critical",
      "Add note to invoice record documenting reason for hold"
    ]
  });

  return { kind: "checkbox", blocks };
}

export function getRecommendedActions(
  matter: PassportMatter,
  bundle: SignalBundle,
  role: UserRole
): ActionPlan {
  switch (role) {
    case "RISKRADAR_FULL_ACCESS":
      return legalOpsActions(matter, bundle);
    case "RISKRADAR_EXEC_VIEW":
      return generalCounselActions(matter, bundle);
    case "RISKRADAR_MATTER_VIEW":
      return billReviewerActions(matter, bundle);
  }
}
