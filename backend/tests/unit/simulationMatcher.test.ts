import { describe, expect, it } from "vitest";
import { matchSimulationPreset } from "../../src/services/simulation.service";

describe("simulation preset matching", () => {
  it("matches supported prompts directly", () => {
    const result = matchSimulationPreset("employment class action filings surge in california");
    expect(result.preset.id).toBe("sim-employment-surge");
    expect(result.isApproximation).toBe(false);
  });

  it("falls back with approximation for unsupported prompts", () => {
    const result = matchSimulationPreset("supply chain earthquake disruption");
    expect(result.isApproximation).toBe(true);
  });
});