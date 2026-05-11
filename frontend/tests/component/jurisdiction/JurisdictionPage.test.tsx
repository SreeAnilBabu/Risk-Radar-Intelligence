import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { JurisdictionPage } from "../../../src/pages/JurisdictionPage";

vi.mock("../../../src/features/drilldown/useJurisdictionDrilldown", () => ({
  useJurisdictionDrilldown: () => ({
    loading: false,
    error: null,
    jurisdiction: { id: "US-CA", name: "California", code: "CA", overallRiskScore: 88, riskLevel: "critical", trendDirection: "rising", topRiskFactors: { financialExposure: 92, matterComplexity: 88, deadlinePressure: 82, regulatoryVolatility: 96, vendorPerformanceRisk: 78 }, matterCount: 24, totalSpend: 1280000, openAlerts: 4, geometryRef: "west-ca", lastUpdatedAt: "2026-04-21T08:45:00.000Z" },
    matters: [
      { id: "m1", jurisdictionId: "US-CA", title: "Z matter", practiceArea: "Employment", status: "open", riskScore: 80, spendToDate: 120000, outsideCounselVendorId: "v1", summary: "s", updatedAt: "2026-04-21T00:00:00.000Z" },
      { id: "m2", jurisdictionId: "US-CA", title: "A matter", practiceArea: "Commercial", status: "open", riskScore: 70, spendToDate: 100000, outsideCounselVendorId: "v1", summary: "s", updatedAt: "2026-04-21T00:00:00.000Z" }
    ],
    vendors: [{ id: "v1", name: "Vendor 1", activeMatterCount: 2, totalSpend: 220000, performanceRiskScore: 72, billingAnomalyCount: 1, jurisdictionIds: ["US-CA"] }]
  })
}));

describe("JurisdictionPage", () => {
  it("supports matter sorting and shows vendor context", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={["/jurisdiction/US-CA"]}>
        <Routes>
          <Route path="/jurisdiction/:id" element={<JurisdictionPage />} />
        </Routes>
      </MemoryRouter>
    );

    await user.selectOptions(screen.getByDisplayValue("Risk"), "Title");
    await waitFor(() => expect(screen.getByText("Vendor and spend context")).toBeInTheDocument());
    expect(screen.getByText("Vendor 1")).toBeInTheDocument();
  });
});
