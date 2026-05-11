import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { BriefingPanel } from "../../../src/features/briefing/BriefingPanel";

vi.mock("../../../src/features/briefing/briefing.service", () => ({
  fetchDailyBriefing: () => Promise.resolve({
    id: "b1",
    generatedAt: "2026-04-21T00:00:00.000Z",
    topRisks: ["California is critical."],
    changesSinceYesterday: ["Texas rose."],
    recommendedActions: ["Escalate New York."],
    narrative: "California and New York remain critical while Texas is rising.",
    latencyMs: 82
  }),
  submitRiskQuestion: () => Promise.resolve({ answer: "Texas is rising because deadline pressure increased." })
}));

describe("BriefingPanel", () => {
  it("loads the briefing and supports follow-up questions", async () => {
    const user = userEvent.setup();
    render(<BriefingPanel />);

    await waitFor(() => expect(screen.getByText(/California and New York remain critical/)).toBeInTheDocument());
    await user.type(screen.getByLabelText("Ask a follow-up question"), "Why is Texas rising?");
    await user.click(screen.getByRole("button", { name: "Ask" }));

    await waitFor(() => expect(screen.getByText(/deadline pressure increased/)).toBeInTheDocument());
  });
});
