import { loadJurisdictions } from "../data/loaders";
import { getRiskLevel } from "./riskScore.service";
import { type SimulationPreset, type SimulationResult } from "../types/domain";

const PRESETS: SimulationPreset[] = [
  {
    id: "sim-employment-surge",
    name: "Employment filing surge",
    tags: ["employment", "filings", "class action", "wage", "labor"],
    baselineJurisdictionIds: ["US-CA", "US-NY", "US-TX"],
    expectedImpactSummary: "Employment litigation accelerates in core labor-heavy jurisdictions.",
    scoreDeltaByJurisdiction: { "US-CA": 6, "US-NY": 4, "US-TX": 5 },
    recommendedMitigations: [
      "Increase early case assessment bandwidth in California and Texas.",
      "Freeze discretionary vendor work and prioritize labor specialists.",
      "Update board talking points with reserve sensitivity ranges."
    ],
    projectedFinancialImpact: 485000
  },
  {
    id: "sim-regulatory-crackdown",
    name: "Regulatory crackdown",
    tags: ["regulatory", "enforcement", "guidance", "compliance", "audit"],
    baselineJurisdictionIds: ["US-NY", "US-NJ", "US-IL"],
    expectedImpactSummary: "Regulatory change raises procedural and deadline pressure in eastern jurisdictions.",
    scoreDeltaByJurisdiction: { "US-NY": 5, "US-NJ": 4, "US-IL": 3 },
    recommendedMitigations: [
      "Stand up a cross-functional response for labor and benefits teams.",
      "Re-sequence evidence collection to protect response deadlines.",
      "Prepare external counsel overflow coverage."
    ],
    projectedFinancialImpact: 290000
  },
  {
    id: "sim-vendor-disruption",
    name: "Vendor disruption",
    tags: ["vendor", "billing", "staffing", "outside counsel"],
    baselineJurisdictionIds: ["US-TX", "US-CA", "US-FL"],
    expectedImpactSummary: "Outside counsel instability creates execution drag and spend leakage.",
    scoreDeltaByJurisdiction: { "US-TX": 6, "US-CA": 3, "US-FL": 2 },
    recommendedMitigations: [
      "Shift deadline-sensitive work to the highest-performing vendor bench.",
      "Review staffing continuity clauses in active engagements.",
      "Monitor invoice anomalies weekly until variance normalizes."
    ],
    projectedFinancialImpact: 210000
  }
];

function normalizeTokens(input: string): string[] {
  return input.toLowerCase().split(/[^a-z]+/).filter(Boolean);
}

function scorePreset(prompt: string, preset: SimulationPreset): number {
  const tokens = normalizeTokens(prompt);
  return preset.tags.reduce((score, tag) => score + (tokens.includes(tag) ? 1 : 0), 0);
}

export function matchSimulationPreset(prompt: string): { preset: SimulationPreset; isApproximation: boolean } {
  const ranked = PRESETS
    .map((preset) => ({ preset, score: scorePreset(prompt, preset) }))
    .sort((left, right) => right.score - left.score);

  const best = ranked[0]?.preset ?? PRESETS[0];
  const isApproximation = (ranked[0]?.score ?? 0) === 0;
  return { preset: best, isApproximation };
}

export async function runSimulation(prompt: string, baselineJurisdictionIds?: string[]): Promise<SimulationResult> {
  const jurisdictions = await loadJurisdictions();
  const { preset, isApproximation } = matchSimulationPreset(prompt);
  const baselineIds = baselineJurisdictionIds && baselineJurisdictionIds.length > 0
    ? baselineJurisdictionIds
    : preset.baselineJurisdictionIds;

  const projectedJurisdictionChanges = jurisdictions
    .filter((jurisdiction) => baselineIds.includes(jurisdiction.id))
    .map((jurisdiction) => {
      const delta = preset.scoreDeltaByJurisdiction[jurisdiction.id] ?? 0;
      const afterScore = Math.max(0, Math.min(100, jurisdiction.overallRiskScore + delta));
      return {
        jurisdictionId: jurisdiction.id,
        beforeScore: jurisdiction.overallRiskScore,
        afterScore,
        delta,
        beforeLevel: jurisdiction.riskLevel,
        afterLevel: getRiskLevel(afterScore)
      };
    });

  const result: SimulationResult = {
    requestId: `sim-${Date.now()}`,
    inputPrompt: prompt,
    matchedPresetId: preset.id,
    isApproximation,
    projectedJurisdictionChanges,
    projectedFinancialImpact: preset.projectedFinancialImpact,
    recommendedMitigations: preset.recommendedMitigations,
    generatedAt: new Date().toISOString()
  };

  if (isApproximation) {
    result.disclaimer = "This scenario is not directly modeled. Results are estimated from the closest supported preset and should be treated as directional guidance.";
  }

  return result;
}
