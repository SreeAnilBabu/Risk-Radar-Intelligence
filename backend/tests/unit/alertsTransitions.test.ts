import { describe, expect, it } from "vitest";
import { getAlertCounters } from "../../src/services/alerts.service";

describe("alerts service counters and queue semantics", () => {
  it("counts unread, snoozed, and escalated alerts correctly", () => {
    const counters = getAlertCounters([
      { id: "1", jurisdictionId: "US-CA", type: "threshold_breach", severity: "critical", status: "unread", message: "a", recommendedAction: "b", createdAt: "2026-04-21T00:00:00.000Z", updatedAt: "2026-04-21T00:00:00.000Z" },
      { id: "2", jurisdictionId: "US-NY", type: "regulatory_change", severity: "critical", status: "escalated", message: "a", recommendedAction: "b", createdAt: "2026-04-21T00:00:00.000Z", updatedAt: "2026-04-21T00:00:00.000Z", escalatedAt: "2026-04-21T00:00:00.000Z" },
      { id: "3", jurisdictionId: "US-TX", type: "deadline_risk", severity: "high", status: "snoozed", message: "a", recommendedAction: "b", createdAt: "2026-04-21T00:00:00.000Z", updatedAt: "2026-04-21T00:00:00.000Z" }
    ]);

    expect(counters).toEqual({ unread: 1, snoozed: 1, escalated: 1, total: 3 });
  });
});
