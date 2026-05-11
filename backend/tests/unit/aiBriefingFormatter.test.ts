import { describe, expect, it } from "vitest";
import { createBriefing } from "../../src/services/aiMock.service";

describe("aiMock.service briefing", () => {
  it("keeps the seeded narrative baseline intact", async () => {
    const briefing = await createBriefing({ focus: "daily" });

    expect(briefing.narrative).toContain("California and New York remain critical");
    expect(briefing.narrative).toContain("Texas");
    expect(briefing.topRisks).toHaveLength(3);
  });
});
