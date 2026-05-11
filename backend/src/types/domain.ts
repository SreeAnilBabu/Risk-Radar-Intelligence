import { z } from "zod";

export const riskLevelSchema = z.enum(["low", "medium", "high", "critical"]);
export const trendDirectionSchema = z.enum(["falling", "stable", "rising"]);
export const alertStatusSchema = z.enum(["unread", "read", "snoozed", "escalated"]);
export const alertActionSchema = z.enum(["mark_read", "snooze", "escalate"]);

export type RiskLevel = z.infer<typeof riskLevelSchema>;
export type TrendDirection = z.infer<typeof trendDirectionSchema>;
export type AlertStatus = z.infer<typeof alertStatusSchema>;
export type AlertAction = z.infer<typeof alertActionSchema>;

export const riskFactorContributionSchema = z.object({
  financialExposure: z.number().min(0).max(100),
  matterComplexity: z.number().min(0).max(100),
  deadlinePressure: z.number().min(0).max(100),
  regulatoryVolatility: z.number().min(0).max(100),
  vendorPerformanceRisk: z.number().min(0).max(100)
});

export type RiskFactorContribution = z.infer<typeof riskFactorContributionSchema>;

export const jurisdictionSchema = z.object({
  id: z.string(),
  name: z.string(),
  code: z.string()
});

export type Jurisdiction = z.infer<typeof jurisdictionSchema>;

export const rawJurisdictionSchema = jurisdictionSchema.extend({
  trendDirection: trendDirectionSchema,
  riskFactors: riskFactorContributionSchema,
  matterCount: z.number().int().min(0),
  totalSpend: z.number().min(0),
  openAlerts: z.number().int().min(0),
  geometryRef: z.string()
});

export const jurisdictionRiskProfileSchema = jurisdictionSchema.extend({
  overallRiskScore: z.number().min(0).max(100),
  riskLevel: riskLevelSchema,
  trendDirection: trendDirectionSchema,
  topRiskFactors: riskFactorContributionSchema,
  matterCount: z.number().int().min(0),
  totalSpend: z.number().min(0),
  openAlerts: z.number().int().min(0),
  geometryRef: z.string(),
  lastUpdatedAt: z.string().datetime()
});

export type RawJurisdiction = z.infer<typeof rawJurisdictionSchema>;
export type JurisdictionRiskProfile = z.infer<typeof jurisdictionRiskProfileSchema>;

export const riskTrendPointSchema = z.object({
  id: z.string(),
  jurisdictionId: z.string(),
  timestamp: z.string().datetime(),
  score: z.number().min(0).max(100),
  riskLevel: riskLevelSchema
});

export type RiskTrendPoint = z.infer<typeof riskTrendPointSchema>;

export const matterRiskRecordSchema = z.object({
  id: z.string(),
  matterNumber: z.string().nullable().optional(),
  jurisdictionId: z.string(),
  jurisdictionCode: z.string().nullable().optional(),
  jurisdictionName: z.string().nullable().optional(),
  title: z.string(),
  practiceArea: z.string(),
  status: z.enum(["open", "at_risk", "closed"]),
  riskScore: z.number().min(0).max(100),
  spendToDate: z.number().min(0),
  budgetTotal: z.number().min(0).nullable().optional(),
  outsideCounselVendorId: z.string(),
  vendorName: z.string().nullable().optional(),
  deadlineAt: z.string().datetime().optional(),
  summary: z.string(),
  updatedAt: z.string().datetime()
});

export type MatterRiskRecord = z.infer<typeof matterRiskRecordSchema>;

export const riskAlertSchema = z.object({
  id: z.string(),
  jurisdictionId: z.string(),
  matterId: z.string().optional(),
  type: z.enum(["threshold_breach", "regulatory_change", "spend_anomaly", "deadline_risk"]),
  severity: riskLevelSchema,
  status: alertStatusSchema,
  message: z.string(),
  recommendedAction: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  escalatedAt: z.string().datetime().optional()
});

export type RiskAlert = z.infer<typeof riskAlertSchema>;

export const alertCountersSchema = z.object({
  unread: z.number().int().min(0),
  snoozed: z.number().int().min(0),
  escalated: z.number().int().min(0),
  total: z.number().int().min(0)
});

export type AlertCounters = z.infer<typeof alertCountersSchema>;

export const vendorRiskSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  activeMatterCount: z.number().int().min(0),
  totalSpend: z.number().min(0),
  performanceRiskScore: z.number().min(0).max(100),
  billingAnomalyCount: z.number().int().min(0),
  jurisdictionIds: z.array(z.string())
});

export type VendorRiskSummary = z.infer<typeof vendorRiskSummarySchema>;

export const aiBriefingRequestSchema = z.object({
  focus: z.enum(["daily", "jurisdiction", "board"]).optional(),
  jurisdictionIds: z.array(z.string()).optional()
});

export const aiBriefingSchema = z.object({
  id: z.string(),
  generatedAt: z.string().datetime(),
  topRisks: z.array(z.string()),
  changesSinceYesterday: z.array(z.string()),
  recommendedActions: z.array(z.string()),
  narrative: z.string(),
  latencyMs: z.number().int().min(0)
});

export type AIBriefing = z.infer<typeof aiBriefingSchema>;
export type AIBriefingRequest = z.infer<typeof aiBriefingRequestSchema>;

export const aiQueryRequestSchema = z.object({
  question: z.string().min(3),
  context: z.record(z.unknown()).optional()
});

export const aiQueryResponseSchema = z.object({
  id: z.string(),
  question: z.string(),
  answer: z.string(),
  relatedJurisdictionIds: z.array(z.string()),
  relatedMatterIds: z.array(z.string()),
  suggestedNextQuestions: z.array(z.string()),
  generatedAt: z.string().datetime()
});

export type AIQueryRequest = z.infer<typeof aiQueryRequestSchema>;
export type AIQueryResponse = z.infer<typeof aiQueryResponseSchema>;

export const simulationRequestSchema = z.object({
  prompt: z.string().min(3),
  baselineJurisdictionIds: z.array(z.string()).optional()
});

export const projectedRiskChangeSchema = z.object({
  jurisdictionId: z.string(),
  beforeScore: z.number().min(0).max(100),
  afterScore: z.number().min(0).max(100),
  delta: z.number(),
  beforeLevel: riskLevelSchema,
  afterLevel: riskLevelSchema
});

export const simulationResultSchema = z.object({
  requestId: z.string(),
  inputPrompt: z.string(),
  matchedPresetId: z.string(),
  isApproximation: z.boolean(),
  disclaimer: z.string().optional(),
  projectedJurisdictionChanges: z.array(projectedRiskChangeSchema),
  projectedFinancialImpact: z.number(),
  recommendedMitigations: z.array(z.string()),
  generatedAt: z.string().datetime()
}).superRefine((value, context) => {
  if (value.isApproximation && !value.disclaimer) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "disclaimer is required when the result is an approximation",
      path: ["disclaimer"]
    });
  }
});

export type SimulationRequest = z.infer<typeof simulationRequestSchema>;
export type ProjectedRiskChange = z.infer<typeof projectedRiskChangeSchema>;
export type SimulationResult = z.infer<typeof simulationResultSchema>;

export type SimulationPreset = {
  id: string;
  name: string;
  tags: string[];
  baselineJurisdictionIds: string[];
  expectedImpactSummary: string;
  scoreDeltaByJurisdiction: Record<string, number>;
  recommendedMitigations: string[];
  projectedFinancialImpact: number;
};

export const errorResponseSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string()
  })
});

export type ErrorResponse = z.infer<typeof errorResponseSchema>;

/* ────────────────────────────────────────────────────────────────────────
 * BUDGET HISTORY (CL-007 / FR-026)
 * ──────────────────────────────────────────────────────────────────────── */

export const budgetRevisionSchema = z.object({
  id: z.string(),
  label: z.string(),
  date: z.string().datetime(),
  amount: z.number().min(0),
  delta: z.number(),
  reason: z.string(),
  approvedBy: z.string(),
  status: z.enum(["original", "approved", "pending"])
});

export const matterBudgetHistorySchema = z.object({
  matterId: z.string(),
  matterNumber: z.string(),
  matterTitle: z.string(),
  originalBudget: z.number().min(0),
  currentApprovedTotal: z.number().min(0),
  currentBurn: z.number().min(0),
  remainingAtCurrentBurn: z.number(),
  projectedNextRevisionAt: z.string().datetime().nullable(),
  monthlyBurnRate: z.number().min(0),
  reallocationRiskLevel: z.enum(["low", "medium", "high"]),
  reallocationRiskNote: z.string(),
  advisoryNote: z.string().nullable(),
  revisions: z.array(budgetRevisionSchema)
});

export type BudgetRevision = z.infer<typeof budgetRevisionSchema>;
export type MatterBudgetHistory = z.infer<typeof matterBudgetHistorySchema>;

/* ────────────────────────────────────────────────────────────────────────
 * MATTER ACTIVITY TIMELINE (CL-009 / FR-028)
 * ──────────────────────────────────────────────────────────────────────── */

export const matterActivityEventSchema = z.object({
  id: z.string(),
  matterId: z.string(),
  type: z.enum([
    "matter_opened",
    "budget_revision",
    "invoice_submitted",
    "invoice_approved",
    "rate_card_violation",
    "alert_raised"
  ]),
  severity: z.enum(["info", "warn", "critical"]),
  occurredAt: z.string().datetime(),
  title: z.string(),
  detail: z.string()
});

export type MatterActivityEvent = z.infer<typeof matterActivityEventSchema>;
