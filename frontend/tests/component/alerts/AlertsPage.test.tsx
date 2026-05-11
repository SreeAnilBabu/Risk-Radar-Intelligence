import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AlertsPage } from "../../../src/pages/AlertsPage";
import { RefreshProvider } from "../../../src/app/state/refreshContext";

const { patchAlertMock } = vi.hoisted(() => ({
  patchAlertMock: vi.fn(() => Promise.resolve({
    data: { id: "alert-1", jurisdictionId: "US-NY", type: "regulatory_change", severity: "critical", status: "escalated", message: "NY alert", recommendedAction: "Act", createdAt: "2026-04-21T00:00:00.000Z", updatedAt: "2026-04-21T00:00:00.000Z", escalatedAt: "2026-04-21T00:00:00.000Z" },
    counters: { unread: 0, snoozed: 0, escalated: 1, total: 1 }
  }))
}));

vi.mock("../../../src/services/endpoints", () => ({
  listAlerts: () => Promise.resolve({
    data: [{ id: "alert-1", jurisdictionId: "US-NY", type: "regulatory_change", severity: "critical", status: "unread", message: "NY alert", recommendedAction: "Act", createdAt: "2026-04-21T00:00:00.000Z", updatedAt: "2026-04-21T00:00:00.000Z" }],
    counters: { unread: 1, snoozed: 0, escalated: 0, total: 1 }
  }),
  patchAlert: patchAlertMock
}));

describe("AlertsPage", () => {
  it("updates the queue and counters when escalating an alert", async () => {
    const user = userEvent.setup();
    render(
      <RefreshProvider>
        <AlertsPage />
      </RefreshProvider>
    );

    await waitFor(() => expect(screen.getByText("NY alert")).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "Escalate" }));
    await waitFor(() => expect(patchAlertMock).toHaveBeenCalled());
    expect(screen.getByText(/Escalated: 1/)).toBeInTheDocument();
  });
});
