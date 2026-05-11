import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { GlobalQueryBar } from "../../../src/features/briefing/GlobalQueryBar";
import { QueryHighlightProvider } from "../../../src/app/state/queryHighlightContext";

vi.mock("../../../src/features/briefing/briefing.service", () => ({
  submitRiskQuestion: () => Promise.resolve({
    answer: "Texas is rising because deadline pressure is building.",
    relatedJurisdictionIds: ["US-TX"]
  })
}));

describe("GlobalQueryBar", () => {
  it("submits a query and surfaces the response", async () => {
    const user = userEvent.setup();
    render(
      <QueryHighlightProvider>
        <GlobalQueryBar />
      </QueryHighlightProvider>
    );

    await user.type(screen.getByLabelText("Global risk query"), "Why is Texas rising?");
    await user.click(screen.getByRole("button", { name: "Query" }));

    await waitFor(() => expect(screen.getByText(/deadline pressure is building/)).toBeInTheDocument());
  });
});