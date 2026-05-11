import { describe, expect, it } from "vitest";
import { calculateRiskScore, clampScore, getRiskLevel } from "../../src/services/riskScore.service";

describe("riskScore.service", () => {
  it("applies the fixed weighted formula from FR-021", () => {
    const score = calculateRiskScore({
      financialExposure: 92,
      matterComplexity: 88,
      deadlinePressure: 82,
      regulatoryVolatility: 96,
      vendorPerformanceRisk: 78
    });

    expect(score).toBe(88.2);
    expect(getRiskLevel(score)).toBe("critical");
  });

  it("clamps scores into the supported 0-100 range", () => {
    expect(clampScore(150)).toBe(100);
    expect(clampScore(-12)).toBe(0);
  });
});
