import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SimulatorPage } from "../../../src/pages/SimulatorPage";

vi.mock("../../../src/features/simulator/useSimulation", () => ({
  useSimulation: () => ({
    loading: false,
    error: null,
    submit: vi.fn(),
    result: {
      requestId: "sim-1",
      inputPrompt: "unsupported scenario",
      matchedPresetId: "sim-employment-surge",
      isApproximation: true,
      disclaimer: "This scenario is not directly modeled.",
      projectedJurisdictionChanges: [{ jurisdictionId: "US-CA", beforeScore: 88, afterScore: 94, delta: 6, beforeLevel: "critical", afterLevel: "critical" }],
      projectedFinancialImpact: 485000,
      recommendedMitigations: ["Increase labor bandwidth."],
      generatedAt: "2026-04-21T00:00:00.000Z"
    }
  })
}));

describe("SimulatorPage", () => {
  it("shows the approximation disclaimer for unsupported prompts", async () => {
    const user = userEvent.setup();
    render(<SimulatorPage />);

    await user.click(screen.getByRole("button", { name: "Run simulation" }));
    expect(screen.getByText("This scenario is not directly modeled.")).toBeInTheDocument();
    expect(screen.getByText(/Projected financial impact/)).toBeInTheDocument();
  });
});
