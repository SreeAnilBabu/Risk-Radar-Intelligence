import type { ReactNode } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { InsightsPage } from "../../../src/pages/InsightsPage";
import { QueryHighlightProvider } from "../../../src/app/state/queryHighlightContext";
import { RefreshProvider } from "../../../src/app/state/refreshContext";

vi.mock("../../../src/services/endpoints", () => ({
  listRisks: () => Promise.resolve({ data: [{ id: "US-CA", name: "California", code: "CA", overallRiskScore: 88, riskLevel: "critical", trendDirection: "rising", topRiskFactors: { financialExposure: 92, matterComplexity: 88, deadlinePressure: 82, regulatoryVolatility: 96, vendorPerformanceRisk: 78 }, matterCount: 24, totalSpend: 1280000, openAlerts: 4, geometryRef: "west-ca", lastUpdatedAt: "2026-04-21T08:45:00.000Z" }, { id: "US-TX", name: "Texas", code: "TX", overallRiskScore: 71, riskLevel: "high", trendDirection: "rising", topRiskFactors: { financialExposure: 74, matterComplexity: 72, deadlinePressure: 69, regulatoryVolatility: 68, vendorPerformanceRisk: 63 }, matterCount: 16, totalSpend: 856000, openAlerts: 2, geometryRef: "south-tx", lastUpdatedAt: "2026-04-21T08:45:00.000Z" }] }),
  listMatters: () => Promise.resolve([{ id: "m1", jurisdictionId: "US-CA", title: "Matter 1", practiceArea: "Employment", status: "open", riskScore: 80, spendToDate: 200000, outsideCounselVendorId: "v1", summary: "s", updatedAt: "2026-04-21T00:00:00.000Z" }]),
  listAlerts: () => Promise.resolve({ data: [{ id: "a1", jurisdictionId: "US-CA", type: "threshold_breach", severity: "critical", status: "unread", message: "m", recommendedAction: "r", createdAt: "2026-04-21T00:00:00.000Z", updatedAt: "2026-04-21T00:00:00.000Z" }], counters: { unread: 1, snoozed: 0, escalated: 0, total: 1 } }),
  listVendors: () => Promise.resolve([{ id: "v1", name: "Vendor 1", activeMatterCount: 1, totalSpend: 200000, performanceRiskScore: 72, billingAnomalyCount: 1, jurisdictionIds: ["US-CA"] }]),
  listRiskTrends: () => Promise.resolve([{ id: "t1", jurisdictionId: "US-CA", timestamp: "2026-04-21", score: 88, riskLevel: "critical" }, { id: "t2", jurisdictionId: "US-TX", timestamp: "2026-04-21", score: 71, riskLevel: "high" }, { id: "t3", jurisdictionId: "US-NY", timestamp: "2026-04-21", score: 85, riskLevel: "critical" }])
}));

vi.mock("../../../src/features/briefing/BriefingPanel", () => ({ BriefingPanel: () => <div>Briefing</div> }));
vi.mock("recharts", async () => {
  const actual = await vi.importActual<object>("recharts");
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: ReactNode }) => <div>{children}</div>
  };
});

describe("InsightsPage", () => {
  it("renders KPI cards and chart sections", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <RefreshProvider>
          <QueryHighlightProvider>
            <InsightsPage />
          </QueryHighlightProvider>
        </RefreshProvider>
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByText("Overall risk")).toBeInTheDocument());
    expect(screen.getByText("Risk trend trajectory")).toBeInTheDocument();
    expect(screen.getByText("Vendor concentration and risk")).toBeInTheDocument();
    await user.click(screen.getByText("Overall risk"));
  });
});
