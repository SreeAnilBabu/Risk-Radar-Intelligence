import { describe, expect, it } from "vitest";
import { buildDashboardViewModel } from "../../src/features/dashboard/selectors";
import type { JurisdictionRiskProfile, MatterRiskRecord, RiskAlert, RiskTrendPoint, VendorRiskSummary } from "../../src/types/domain";

describe("dashboard selectors", () => {
  it("aggregates KPIs and chart datasets", () => {
    const risks: JurisdictionRiskProfile[] = [
      { id: "US-CA", name: "California", code: "CA", overallRiskScore: 80, riskLevel: "critical", trendDirection: "rising", topRiskFactors: { financialExposure: 80, matterComplexity: 80, deadlinePressure: 80, regulatoryVolatility: 80, vendorPerformanceRisk: 80 }, matterCount: 10, totalSpend: 500000, openAlerts: 2, geometryRef: "ca", lastUpdatedAt: "2026-04-21T00:00:00.000Z" },
      { id: "US-TX", name: "Texas", code: "TX", overallRiskScore: 60, riskLevel: "medium", trendDirection: "rising", topRiskFactors: { financialExposure: 60, matterComplexity: 60, deadlinePressure: 60, regulatoryVolatility: 60, vendorPerformanceRisk: 60 }, matterCount: 8, totalSpend: 250000, openAlerts: 1, geometryRef: "tx", lastUpdatedAt: "2026-04-21T00:00:00.000Z" }
    ];
    const matters: MatterRiskRecord[] = [
      { id: "m1", jurisdictionId: "US-CA", title: "Matter 1", practiceArea: "Employment", status: "open", riskScore: 81, spendToDate: 120000, outsideCounselVendorId: "v1", summary: "s", updatedAt: "2026-04-21T00:00:00.000Z" },
      { id: "m2", jurisdictionId: "US-TX", title: "Matter 2", practiceArea: "Commercial", status: "closed", riskScore: 62, spendToDate: 80000, outsideCounselVendorId: "v1", summary: "s", updatedAt: "2026-04-21T00:00:00.000Z" }
    ];
    const alerts: RiskAlert[] = [
      { id: "a1", jurisdictionId: "US-CA", type: "threshold_breach", severity: "critical", status: "unread", message: "m", recommendedAction: "r", createdAt: "2026-04-21T00:00:00.000Z", updatedAt: "2026-04-21T00:00:00.000Z" }
    ];
    const vendors: VendorRiskSummary[] = [
      { id: "v1", name: "Vendor 1", activeMatterCount: 2, totalSpend: 200000, performanceRiskScore: 70, billingAnomalyCount: 1, jurisdictionIds: ["US-CA", "US-TX"] }
    ];
    const trends: RiskTrendPoint[] = [
      { id: "t1", jurisdictionId: "US-CA", timestamp: "2026-04-21", score: 80, riskLevel: "critical" },
      { id: "t2", jurisdictionId: "US-TX", timestamp: "2026-04-21", score: 60, riskLevel: "medium" },
      { id: "t3", jurisdictionId: "US-NY", timestamp: "2026-04-21", score: 75, riskLevel: "high" }
    ];

    const model = buildDashboardViewModel(risks, matters, alerts, vendors, trends);
    expect(model.kpis).toEqual({ overallRisk: 70, activeMatters: 1, totalSpend: 750000, openAlerts: 1 });
    expect(model.practiceAreaDistribution).toHaveLength(2);
    expect(model.vendorRanking[0]?.name).toBe("Vendor 1");
  });
});
