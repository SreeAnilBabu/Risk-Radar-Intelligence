import { type RiskFactorContribution, type RiskLevel } from "../types/domain";

export const RISK_WEIGHTS = {
  financialExposure: 0.3,
  matterComplexity: 0.25,
  deadlinePressure: 0.2,
  regulatoryVolatility: 0.15,
  vendorPerformanceRisk: 0.1
} as const;

export function clampScore(score: number): number {
  return Math.max(0, Math.min(100, Number(score.toFixed(1))));
}

export function calculateRiskScore(factors: RiskFactorContribution): number {
  const weightedScore =
    factors.financialExposure * RISK_WEIGHTS.financialExposure +
    factors.matterComplexity * RISK_WEIGHTS.matterComplexity +
    factors.deadlinePressure * RISK_WEIGHTS.deadlinePressure +
    factors.regulatoryVolatility * RISK_WEIGHTS.regulatoryVolatility +
    factors.vendorPerformanceRisk * RISK_WEIGHTS.vendorPerformanceRisk;

  return clampScore(weightedScore);
}

export function getRiskLevel(score: number): RiskLevel {
  if (score >= 80) {
    return "critical";
  }

  if (score >= 65) {
    return "high";
  }

  if (score >= 50) {
    return "medium";
  }

  return "low";
}
