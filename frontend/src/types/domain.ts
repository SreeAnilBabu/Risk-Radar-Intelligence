export type RiskLevel = "low" | "medium" | "high" | "critical";
export type TrendDirection = "falling" | "stable" | "rising";
export type AlertStatus = "unread" | "read" | "snoozed" | "escalated";
export type AlertAction = "mark_read" | "snooze" | "escalate";

export type RiskFactorContribution = {
  financialExposure: number;
  matterComplexity: number;
  deadlinePressure: number;
  regulatoryVolatility: number;
  vendorPerformanceRisk: number;
};

export type Jurisdiction = {
  id: string;
  name: string;
  code: string;
};

export type JurisdictionRiskProfile = Jurisdiction & {
  overallRiskScore: number;
  riskLevel: RiskLevel;
  trendDirection: TrendDirection;
  topRiskFactors: RiskFactorContribution;
  matterCount: number;
  totalSpend: number;
  openAlerts: number;
  geometryRef: string;
  lastUpdatedAt: string;
};

export type RiskTrendPoint = {
  id: string;
  jurisdictionId: string;
  timestamp: string;
  score: number;
  riskLevel: RiskLevel;
};

export type MatterRiskRecord = {
  id: string;
  matterNumber?: string | null;
  jurisdictionId: string;
  jurisdictionCode?: string | null;
  jurisdictionName?: string | null;
  title: string;
  practiceArea: string;
  status: "open" | "at_risk" | "closed";
  riskScore: number;
  spendToDate: number;
  budgetTotal?: number | null;
  outsideCounselVendorId: string;
  vendorName?: string | null;
  deadlineAt?: string;
  summary: string;
  updatedAt: string;
};

export type RiskAlert = {
  id: string;
  jurisdictionId: string;
  matterId?: string;
  type: "threshold_breach" | "regulatory_change" | "spend_anomaly" | "deadline_risk";
  severity: RiskLevel;
  status: AlertStatus;
  message: string;
  recommendedAction: string;
  createdAt: string;
  updatedAt: string;
  escalatedAt?: string;
};

export type AlertCounters = {
  unread: number;
  snoozed: number;
  escalated: number;
  total: number;
};

export type VendorRiskSummary = {
  id: string;
  name: string;
  activeMatterCount: number;
  totalSpend: number;
  performanceRiskScore: number;
  billingAnomalyCount: number;
  jurisdictionIds: string[];
};

export type AIBriefing = {
  id: string;
  generatedAt: string;
  topRisks: string[];
  changesSinceYesterday: string[];
  recommendedActions: string[];
  narrative: string;
  latencyMs: number;
};

export type AIQueryResponse = {
  id: string;
  question: string;
  answer: string;
  relatedJurisdictionIds: string[];
  relatedMatterIds: string[];
  suggestedNextQuestions: string[];
  generatedAt: string;
};

export type ProjectedRiskChange = {
  jurisdictionId: string;
  beforeScore: number;
  afterScore: number;
  delta: number;
  beforeLevel: RiskLevel;
  afterLevel: RiskLevel;
};

export type SimulationResult = {
  requestId: string;
  inputPrompt: string;
  matchedPresetId: string;
  isApproximation: boolean;
  disclaimer?: string;
  projectedJurisdictionChanges: ProjectedRiskChange[];
  projectedFinancialImpact: number;
  recommendedMitigations: string[];
  generatedAt: string;
};

export type Loadable<T> = {
  data: T | null;
  loading: boolean;
  error: string | null;
};

/* ────────────────────────────────────────────────────────────────────────
 * Budget History (FR-026 / FR-027)
 * ──────────────────────────────────────────────────────────────────────── */
export type BudgetRevision = {
  id: string;
  label: string;
  date: string;
  amount: number;
  delta: number;
  reason: string;
  approvedBy: string;
  status: "original" | "approved" | "pending";
};

export type MatterBudgetHistory = {
  matterId: string;
  matterNumber: string;
  matterTitle: string;
  originalBudget: number;
  currentApprovedTotal: number;
  currentBurn: number;
  remainingAtCurrentBurn: number;
  projectedNextRevisionAt: string | null;
  monthlyBurnRate: number;
  reallocationRiskLevel: "low" | "medium" | "high";
  reallocationRiskNote: string;
  advisoryNote: string | null;
  revisions: BudgetRevision[];
};

/* ────────────────────────────────────────────────────────────────────────
 * Activity Timeline (FR-028 / CL-009)
 * ──────────────────────────────────────────────────────────────────────── */
export type MatterActivityEventType =
  | "matter_opened"
  | "budget_revision"
  | "invoice_submitted"
  | "invoice_approved"
  | "rate_card_violation"
  | "alert_raised";

export type MatterActivityEvent = {
  id: string;
  matterId: string;
  type: MatterActivityEventType;
  severity: "info" | "warn" | "critical";
  occurredAt: string;
  title: string;
  detail: string;
};
