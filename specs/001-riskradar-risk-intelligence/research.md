# Research: RiskRadar Risk Intelligence

## Decision 1: Risk Scoring Model (FR-021)

Decision: Use a deterministic weighted normalized formula:

RiskScore = 0.30 * FinancialExposure + 0.25 * MatterComplexity + 0.20 * DeadlinePressure + 0.15 * RegulatoryVolatility + 0.10 * VendorPerformanceRisk

All factors are normalized to 0-100 and final value is clamped to 0-100.

Rationale:
- Ensures stable and explainable score outputs for executive demos.
- Enables direct unit test assertions and reproducible trend visuals.
- Matches clarified requirement and avoids UI complexity for weight editing.

Alternatives considered:
- User-configurable weights: rejected due to added UI complexity and demo inconsistency risk.
- ML-derived scoring: rejected due to opacity and lack of deterministic behavior in hackathon timeline.

## Decision 2: Refresh Strategy (FR-022)

Decision: Poll backend every 15 seconds for map/dashboard core datasets with stale-while-refresh behavior in UI.

Rationale:
- Satisfies fixed cadence requirement.
- Keeps architecture simple with mock JSON backend.
- Avoids websocket setup overhead while still appearing real-time.

Alternatives considered:
- WebSocket push: rejected as unnecessary complexity for mock-only demo.
- Manual refresh only: rejected because it violates FR-022 and weakens narrative.

## Decision 3: Unsupported Simulation Behavior (FR-023)

Decision: For unsupported prompts, resolve nearest supported preset by similarity scoring over scenario tags and return approximation disclaimer.

Rationale:
- Preserves user flow instead of hard failures.
- Keeps simulator always demoable.
- Aligns with requirement to provide nearest preset plus disclaimer.

Alternatives considered:
- Reject unsupported input with error only: rejected due to poor UX and lower demo quality.
- Free-form LLM inference for every input: rejected for unpredictable output quality and timing risk.

## Decision 4: Alert Escalation Scope (FR-024)

Decision: Escalation updates alert status to escalated and moves item into in-app high-priority queue pinned at top of feed with updated counters.

Rationale:
- Directly satisfies clarified scope.
- Avoids external dependencies (email/chat integrations).
- Keeps behavior visible and testable in one screen.

Alternatives considered:
- External notification dispatch: rejected as explicitly out of scope.
- Separate escalation page: rejected because a pinned queue in same feed is faster to implement and demo.

## Decision 5: AI Integration Approach

Decision: Implement FAB Agent SDK integration points behind service interfaces; provide deterministic mocked responses for briefing, query, and simulation.

Rationale:
- Keeps architecture forward-compatible for real SDK wiring later.
- Guarantees predictable timing for hackathon performance budgets.
- Enables realistic language output while retaining control of narrative.

Alternatives considered:
- Direct hardcoded text in route handlers: rejected due to poor separation and future migration cost.
- Live external AI calls: rejected due to reliability and secret-management constraints.

## Decision 6: State Management

Decision: Use React Context + useReducer with feature-scoped reducers and typed actions.

Rationale:
- Explicitly required by architecture constraints.
- Suitable for moderate complexity and cross-page state needs.
- Simpler than external state libraries in 2.5-day window.

Alternatives considered:
- Redux Toolkit: rejected by stack boundary constraint.
- Local component state only: rejected due to duplicated logic and inconsistent refresh behavior.

## Decision 7: Contract and Validation Strategy

Decision: Define OpenAPI 3.1 contract first, then use Zod schemas in backend for runtime validation and typed DTOs in frontend.

Rationale:
- Shared API truth reduces frontend/backend drift in parallel development.
- Early contract supports quick mock API completion and test automation.
- Runtime validation protects demo from malformed mock data changes.

Alternatives considered:
- Code-first routes without formal contract: rejected due to high coordination risk in 6-person team.
- GraphQL: rejected as unnecessary for fixed endpoint set.

## Decision 8: Performance Guardrails

Decision: Apply staged loading and memoized selectors, precomputed risk buckets, and lightweight payloads to meet budgets.

Rationale:
- Directly targets map <2s and interaction <200ms p95 goals.
- Keeps frontend rendering efficient for map and chart-heavy pages.
- Supports AI and simulation response budgeting with deterministic mock services.

Alternatives considered:
- Full client-side recomputation on every render: rejected due to p95 latency risk.
- Over-optimized infra (worker pools, streaming): rejected as overkill for mock demo scope.
