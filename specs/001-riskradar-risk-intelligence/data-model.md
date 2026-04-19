# Data Model: RiskRadar Risk Intelligence

## Overview

This model supports a mock-data-only architecture and the required routes/pages:
- / (dashboard)
- /map (risk map)
- /alerts (alerts feed)
- /simulator (what-if)
- /jurisdiction/:id (drill-down)

All IDs are strings for simplicity and front-end key stability.

## Entity: JurisdictionRiskProfile

Description: Jurisdiction-level risk posture used by map, dashboard, and drill-down.

Fields:
- id: string (primary key, e.g., US-CA)
- name: string
- code: string (state or jurisdiction code)
- overallRiskScore: number (0-100)
- riskLevel: enum(low, medium, high, critical)
- trendDirection: enum(falling, stable, rising)
- topRiskFactors: RiskFactorContribution[] (top 3 to 5)
- matterCount: number (>= 0)
- totalSpend: number (>= 0)
- openAlerts: number (>= 0)
- geometryRef: string (map layer key)
- lastUpdatedAt: string (ISO timestamp)

Validation rules:
- overallRiskScore must be computed, not manually edited.
- riskLevel derived from score thresholds.
- code must be unique.

## Entity: RiskFactorContribution

Description: Component factors used in FR-021 weighted scoring.

Fields:
- financialExposure: number (0-100)
- matterComplexity: number (0-100)
- deadlinePressure: number (0-100)
- regulatoryVolatility: number (0-100)
- vendorPerformanceRisk: number (0-100)

Derived:
- weightedScore:
  weightedScore =
  0.30 * financialExposure +
  0.25 * matterComplexity +
  0.20 * deadlinePressure +
  0.15 * regulatoryVolatility +
  0.10 * vendorPerformanceRisk
- weightedScore clamped to 0-100.

## Entity: MatterRiskRecord

Description: Matter-level records for drill-down and dashboard context.

Fields:
- id: string (primary key)
- jurisdictionId: string (FK -> JurisdictionRiskProfile.id)
- title: string
- practiceArea: string
- status: enum(open, at_risk, closed)
- riskScore: number (0-100)
- spendToDate: number (>= 0)
- outsideCounselVendorId: string (FK -> VendorRiskSummary.id)
- deadlineAt: string (ISO timestamp, optional)
- summary: string
- updatedAt: string (ISO timestamp)

Validation rules:
- jurisdictionId must exist.
- riskScore in 0-100.

## Entity: VendorRiskSummary

Description: Vendor exposure and performance risk context.

Fields:
- id: string (primary key)
- name: string
- activeMatterCount: number (>= 0)
- totalSpend: number (>= 0)
- performanceRiskScore: number (0-100)
- billingAnomalyCount: number (>= 0)
- jurisdictionIds: string[]

Validation rules:
- performanceRiskScore in 0-100.
- jurisdictionIds values must exist in JurisdictionRiskProfile.

## Entity: RiskAlert

Description: Actionable events for alerts feed and escalation queue.

Fields:
- id: string (primary key)
- jurisdictionId: string (FK -> JurisdictionRiskProfile.id)
- matterId: string (optional FK -> MatterRiskRecord.id)
- type: enum(threshold_breach, regulatory_change, spend_anomaly, deadline_risk)
- severity: enum(low, medium, high, critical)
- status: enum(unread, read, snoozed, escalated)
- message: string
- recommendedAction: string
- createdAt: string (ISO timestamp)
- updatedAt: string (ISO timestamp)
- escalatedAt: string (ISO timestamp, optional)

Behavior rules:
- Escalated items are pinned to top of feed (FR-024).
- Escalation does not trigger external channels.

## Entity: RiskTrendPoint

Description: Time-series points for trends charts.

Fields:
- id: string (primary key)
- jurisdictionId: string (FK -> JurisdictionRiskProfile.id)
- timestamp: string (ISO timestamp)
- score: number (0-100)
- riskLevel: enum(low, medium, high, critical)

Validation rules:
- timestamp monotonically increasing per jurisdiction in generated mock dataset.

## Entity: SimulationPreset

Description: Supported scenario presets used for deterministic simulation.

Fields:
- id: string
- name: string
- tags: string[]
- baselineJurisdictionIds: string[]
- expectedImpactSummary: string
- scoreDeltaByJurisdiction: Record<string, number>

## Entity: SimulationResult

Description: Output for what-if simulation endpoint and UI compare view.

Fields:
- requestId: string
- inputPrompt: string
- matchedPresetId: string
- isApproximation: boolean
- disclaimer: string (required when isApproximation=true)
- projectedJurisdictionChanges: ProjectedRiskChange[]
- projectedFinancialImpact: number
- recommendedMitigations: string[]
- generatedAt: string (ISO timestamp)

## Entity: ProjectedRiskChange

Fields:
- jurisdictionId: string
- beforeScore: number
- afterScore: number
- delta: number
- beforeLevel: enum(low, medium, high, critical)
- afterLevel: enum(low, medium, high, critical)

## Entity: AIBriefing

Description: Executive briefing narrative and highlights.

Fields:
- id: string
- generatedAt: string (ISO timestamp)
- topRisks: string[]
- changesSinceYesterday: string[]
- recommendedActions: string[]
- narrative: string
- latencyMs: number

## Entity: AIQueryResponse

Description: Contextual answer for follow-up or global risk query.

Fields:
- id: string
- question: string
- answer: string
- relatedJurisdictionIds: string[]
- relatedMatterIds: string[]
- suggestedNextQuestions: string[]
- generatedAt: string (ISO timestamp)

## Relationships

- JurisdictionRiskProfile 1 -> many MatterRiskRecord
- JurisdictionRiskProfile 1 -> many RiskAlert
- JurisdictionRiskProfile 1 -> many RiskTrendPoint
- VendorRiskSummary 1 -> many MatterRiskRecord
- SimulationResult many -> many JurisdictionRiskProfile (via projected changes)
- AIBriefing references many JurisdictionRiskProfile conceptually

## State Transitions

### RiskAlert.status

- unread -> read
- unread -> snoozed
- unread -> escalated
- read -> escalated
- snoozed -> unread
- snoozed -> escalated

Rule:
- Any transition to escalated adds item to high-priority in-app queue and updates counters.

## Refresh and Consistency Rules

- Core datasets (/api/risks, /api/risks/trends, /api/alerts) refresh every 15 seconds.
- lastUpdatedAt values should reflect refresh tick timestamp.
- Dashboard and map derive from same refreshed risk snapshot to avoid contradictory views.

## Demo Seed Narrative Constraints

- California and New York must remain critical in default seed state.
- Texas must show rising trend with medium/high trajectory.
- Alerts and AI narratives must reinforce the same storyline.
