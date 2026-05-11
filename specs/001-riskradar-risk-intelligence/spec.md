# Feature Specification: RiskRadar Risk Intelligence Platform

**Feature Branch**: `001-pre-specify-branch`  
**Created**: 2026-04-20  
**Status**: Draft  
**Input**: User description: "Build RiskRadar as a real-time legal risk intelligence weather-map platform for corporate legal leaders using Passport ELM context."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Risk Weather Map Overview (Priority: P1)

A General Counsel can open the platform and immediately see jurisdiction-level legal risk using a visual weather-map style overview with clear severity states and rapid drill-in.

**Why this priority**: This is the core value proposition and fastest way for executives to understand portfolio risk posture.

**Independent Test**: Can be fully tested by loading the map with seeded jurisdictions, selecting a region, and verifying risk state, trend, top factors, and spend/matter context are shown without relying on other stories.

**Acceptance Scenarios**:

1. **Given** the user lands on the map view, **When** jurisdiction overlays load, **Then** each jurisdiction shows one consistent risk level indicator and legend mapping.
2. **Given** the user selects a jurisdiction, **When** details are requested, **Then** the system shows risk score, top risk factors, matter count, total spend, and trend direction.
3. **Given** any jurisdiction crosses critical risk threshold, **When** the map refreshes, **Then** that jurisdiction is visually emphasized as critical and remains distinguishable for color-blind users.

---

### User Story 2 - Executive AI Risk Briefing (Priority: P1)

A CLO can review a plain-language daily briefing that summarizes top risks, key changes, and recommended actions, then ask follow-up questions.

**Why this priority**: Leadership decisions require immediate narrative context, not just charts.

**Independent Test**: Can be independently tested by generating a daily briefing from seeded risk inputs and validating that follow-up prompts return contextual responses tied to the same risk narrative.

**Acceptance Scenarios**:

1. **Given** current risk data is available, **When** the user requests the daily briefing, **Then** the platform returns top risks, changes since yesterday, and recommended actions in executive language.
2. **Given** the briefing is shown, **When** the user asks a follow-up question about a highlighted risk, **Then** the platform returns a contextual explanation tied to the same jurisdiction or practice-area risk.

---

### User Story 3 - Legal Ops Risk Dashboard (Priority: P1)

A Legal Ops Director can monitor risk KPIs and trends from a single dashboard to track performance, spend exposure, and category concentration.

**Why this priority**: Operational owners need a persistent command center for monitoring and planning.

**Independent Test**: Can be independently tested by loading KPI cards and chart panels from seeded data and verifying values align with underlying records.

**Acceptance Scenarios**:

1. **Given** the dashboard loads, **When** KPI cards render, **Then** overall risk score, active matters, total spend, and open alerts are displayed.
2. **Given** historical and categorical data exists, **When** charts render, **Then** trend, practice-area distribution, vendor risk ranking, and spend-vs-risk anomaly views are available.

---

### User Story 4 - Real-Time Risk Alerts (Priority: P2)

A GC can receive and manage timely risk alerts to intervene before issues escalate.

**Why this priority**: Alerts convert passive monitoring into proactive response.

**Independent Test**: Can be independently tested by feeding threshold, regulatory, spend, and deadline events and verifying alert creation, visibility, and lifecycle actions.

**Acceptance Scenarios**:

1. **Given** a risk event meets alert criteria, **When** alert processing runs, **Then** a severity-tagged alert appears with timestamp, affected jurisdiction, and recommended action.
2. **Given** unread alerts exist, **When** the user marks read, snoozes, or escalates one alert, **Then** status updates are reflected in the alert list and unread count.

---

### User Story 5 - What-If Risk Simulator (Priority: P2)

A Deputy GC can submit hypothetical legal scenarios and compare projected risk impact against the current state.

**Why this priority**: Scenario modeling is high-value for strategic planning and board communication.

**Independent Test**: Can be independently tested by submitting predefined scenarios and validating projected score changes, affected jurisdictions, and mitigation guidance.

**Acceptance Scenarios**:

1. **Given** the user submits a scenario question, **When** simulation completes, **Then** projected risk changes, financial impact estimate, and recommended mitigations are shown.
2. **Given** current and simulated states are available, **When** comparison is displayed, **Then** users can clearly see before/after differences across impacted regions.

---

### User Story 6 - Risk Drill-Down Investigation (Priority: P2)

A Legal Ops Director can drill from map or dashboard signals into underlying matter and vendor drivers.

**Why this priority**: Root-cause analysis is necessary to convert insights into action.

**Independent Test**: Can be independently tested by selecting one jurisdiction or practice area and validating that associated matters, vendors, spend context, and risk summaries are shown.

**Acceptance Scenarios**:

1. **Given** a risk indicator is selected, **When** drill-down opens, **Then** related matters are listed with sortable operational details.
2. **Given** matter-level records are available, **When** detail is requested, **Then** users can view vendor and spend context with concise risk summary.

---

### User Story 7 - Natural Language Risk Query (Priority: P3)

A GC can ask conversational risk questions and receive both narrative answers and visual highlights.

**Why this priority**: This elevates usability and demo impact after core monitoring workflows are in place.

**Independent Test**: Can be independently tested by entering supported risk queries and verifying mapped response narrative plus corresponding visual focus updates.

**Acceptance Scenarios**:

1. **Given** a supported natural-language query is entered, **When** interpretation succeeds, **Then** the system returns an answer and highlights relevant map/dashboard elements.
2. **Given** a query is ambiguous, **When** the system cannot determine intent confidently, **Then** it requests refinement and preserves current visual context.

### Edge Cases

- Jurisdiction data is missing or delayed for one refresh cycle.
- Alert volume spikes beyond normal daily levels.
- A simulation request references a scenario outside the supported preset catalog.
- Two filters conflict and would produce empty result sets.
- One or more visual encodings are not distinguishable for color-blind users.
- Risk trend data contains outliers that could distort dashboard interpretation.
- A matter has no budget revisions yet (Budget History card must show an empty-state instead of an error).
- The Passport deep-link base URL is not configured (the "Open Matter in Passport" button must degrade gracefully without crashing the app).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST provide a jurisdiction-based risk map with clear low/medium/high/critical states.
- **FR-002**: The system MUST display a consistent legend and non-color indicators for each risk state.
- **FR-003**: Users MUST be able to select a jurisdiction and view risk score, top risk factors, matter count, total spend, and trend direction.
- **FR-004**: The system MUST refresh risk views frequently enough to present near-real-time situational awareness during the demo.
- **FR-005**: The system MUST provide a daily executive risk briefing with top risks, changes, and recommended actions.
- **FR-006**: Users MUST be able to ask follow-up briefing questions and receive context-aware answers.
- **FR-007**: The system MUST display KPI cards for overall risk, active matters, total legal spend, and open alerts.
- **FR-008**: The system MUST provide trend and distribution visualizations covering time, practice area, vendor concentration, and spend-versus-risk patterning.
- **FR-009**: The system MUST generate risk alerts for threshold breach, regulatory change, spend anomaly, and deadline risk.
- **FR-010**: Users MUST be able to mark alerts as read, snooze alerts, and escalate alerts.
- **FR-011**: The system MUST provide a scenario simulator that accepts natural-language prompts and returns projected impact outputs.
- **FR-012**: The simulator MUST show side-by-side comparison between current and simulated risk states.
- **FR-013**: The system MUST allow drill-down from map and dashboard signals to underlying matters and vendors.
- **FR-014**: Drill-down views MUST include sortable matter listings and spend context.
- **FR-015**: The system MUST provide a global natural-language query entry point for cross-cutting risk questions.
- **FR-016**: Query responses MUST include both textual interpretation and corresponding visual emphasis in relevant views.
- **FR-017**: All core user journeys MUST be visually demonstrable within a 7-minute narrated demo sequence.
- **FR-018**: The system MUST operate exclusively from local JSON seed data; live Passport database connectivity is removed for demo and the data-source toggle MUST default to JSON with no runtime path that calls the database.
- **FR-019**: The system MUST exclude user authentication, external notification delivery, PDF export, and multi-tenant administration from scope.
- **FR-020**: The system MUST maintain accessible interaction paths for critical flows, including keyboard navigation and assistive labeling.

### Constitution Alignment *(mandatory)*

- **CA-001 Code Quality**: Feature delivery MUST use TypeScript strict mode, no `any`, React functional components + hooks only, and Pages -> Layouts -> Features -> UI Components hierarchy.
- **CA-002 Testing**: Unit tests MUST cover utility/risk logic and component tests MUST cover critical interactions (map clicks, filter changes). End-to-end tests are excluded for this hackathon scope.
- **CA-003 UX**: Primary experience MUST be dark-theme-first, desktop-first, with loading skeletons for async states and clear risk-level semantics.
- **CA-004 Performance**: Initial map load target and interaction latency target MUST meet constitution budgets, with caching and staged loading strategies.
- **CA-005 Architecture**: Delivery MUST stay within approved stack boundaries and use FAB Agent experiences backed by mock data.
- **CA-006 Demo Scope**: All committed stories MUST be directly demo-visible within the 7-minute narrative.
- **CA-007 Security + Accessibility**: No real secrets are allowed; critical paths MUST include assistive labeling and keyboard operation.
- **CA-008 Scope Governance**: Out-of-scope items (auth/login, DB migrations/ORM, CI/CD pipeline work) MUST NOT be introduced.

### Key Entities *(include if feature involves data)*

- **Jurisdiction Risk Profile**: Represents jurisdiction-level risk posture, trend direction, contributing factors, and exposure context.
- **Matter Risk Record**: Represents individual legal matters with practice-area alignment, status, spend posture, and risk contribution.
- **Vendor Risk Summary**: Represents law firm/vendor aggregate exposure and quality/risk indicators.
- **Risk Alert**: Represents actionable risk events with type, severity, affected area, timestamp, and lifecycle status.
- **Risk Time Series Point**: Represents historical snapshots used for trend interpretation and anomaly visibility.
- **Simulation Scenario Result**: Represents projected risk changes and mitigation guidance for hypothetical events.
- **Matter Budget Revision**: Represents an originating budget plus subsequent revisions for a matter, including revision date, delta amount, reason, approver, current approved total, remaining balance at current burn, and projected next-revision date.
- **Matter Activity Event**: Represents a chronological event on a matter, scoped to five types — matter opened, budget revision approved, invoice submitted/approved, rate-card violation detected, and alert raised — with timestamp, severity, and a short narrative.
- **Recommended Action**: Represents a prioritized, checkbox-style action item for a matter (rule-derived from matter signals, with curated overrides for demo-narrative matters), tracked locally in the browser only.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can identify the top three high-risk jurisdictions within 30 seconds of opening the map.
- **SC-002**: Map view becomes fully usable within 2 seconds for a dataset of at least 50 jurisdictions.
- **SC-003**: User-initiated map and filter interactions respond in under 200ms for 95% of interactions during demo rehearsal.
- **SC-004**: Daily AI briefing is available within 5 seconds for 95% of requests.
- **SC-005**: What-if simulation outputs are returned within 8 seconds for 95% of supported scenarios.
- **SC-006**: Dashboard presents at least five distinct risk visualization perspectives (KPI, trend, category, vendor, anomaly).
- **SC-007**: 100% of P1 stories can be demonstrated end-to-end without manual data correction during rehearsal.
- **SC-008**: At least 90% of pilot viewers can correctly interpret risk severity from visual cues, including non-color indicators.

## Assumptions

- Demo environment is Chrome or Edge desktop with stable local network conditions.
- Seeded data is authoritative for demo scoring and will be curated to support a clear executive narrative.
- FAB Agent user-facing behaviors are demonstrated through realistic, controlled responses derived from seeded context.
- Mobile-first optimization is intentionally deferred in favor of desktop-first executive workflows for this hackathon submission.
- Team capacity remains fixed at six contributors across the 2.5-day implementation window.

## Clarifications (2026-04-20)

### Session Answers Applied

- **CL-001 Risk Formula Decision**: Risk score calculation is system-defined (not end-user configured for demo scope) using a weighted normalized model:
	`RiskScore = 0.30 * FinancialExposure + 0.25 * MatterComplexity + 0.20 * DeadlinePressure + 0.15 * RegulatoryVolatility + 0.10 * VendorPerformanceRisk`.
	Each factor is normalized to a 0-100 scale and output is clamped to 0-100.
- **CL-002 Refresh Cadence**: Map and dashboard risk data refresh cadence is fixed at every 15 seconds in demo mode.
- **CL-003 Simulation Scope**: Unsupported what-if prompts use preset-only fallback: the system returns the closest supported scenario plus a disclaimer that estimates are based on nearest modeled conditions.
- **CL-004 Alert Escalation Behavior**: "Escalate" creates an in-app high-priority item (pinned at top with updated badge counts). No external email or messaging integrations are triggered.
- **CL-005 Demo Narrative Baseline**: Default seeded storyline is an employment risk spike narrative: California and New York are critical, Texas trend is rising, and supporting alerts explain operational and spend pressure.

### Requirement Updates From Clarification

- **FR-021**: The system MUST compute risk scores using a fixed weighted normalized model and MUST NOT require end-user weight configuration in hackathon scope.
- **FR-022**: The system MUST refresh demo risk views automatically every 15 seconds.
- **FR-023**: For unsupported simulation prompts, the system MUST return the nearest preset scenario with a clear approximation disclaimer.
- **FR-024**: Alert escalation MUST remain in-application only by moving alerts into a prioritized queue with visual prominence and updated counters.

## Clarifications (2026-05-07)

### Session Answers Applied

- **CL-006 Open Matter in Passport Button**: The Matter Detail page MUST render an "Open Matter in Passport — Budget Tab" deep-link button. The link target is built from a frontend environment variable (`VITE_PASSPORT_BASE_URL`) using the pattern `${VITE_PASSPORT_BASE_URL}/matter/{matterId}/budget` and opens in a new browser tab. When the env var is unset, the button MUST fall back to a safe placeholder URL so the app never crashes and the demo flow remains intact.
- **CL-007 Budget History Data Scope**: Rich, hand-curated budget revision histories are seeded only for the demo-narrative matters (matter #1042 "Smith v. Acme Corp" plus 2–3 supporting matters in the California Employment cluster). All other matters render a "No revisions yet" empty state for the Budget History card.
- **CL-008 Passport DB Soft Disconnect**: The Passport SQL Server data source MUST be disconnected at runtime. The `RISKRADAR_DATA_SOURCE=passport` code path MUST be removed from API routes so JSON loaders are the only runtime data source. The probe scripts under `backend/scripts/` MUST be removed. The `passportDb.ts` and `passportRepo.ts` files plus the `mssql` dependency MAY remain in the repository as dormant code for a follow-up cleanup, but MUST NOT be reachable from any executing route.
- **CL-009 Activity Timeline Event Types**: The Activity Timeline on the Matter Detail page MUST surface exactly five event types in reverse-chronological order: matter opened, budget revision approved, invoice submitted/approved, rate-card violation detected, and alert raised. Other event types are out of scope for this iteration.
- **CL-010 Recommended Actions Generation**: Recommended Actions MUST be produced by a deterministic rules engine that derives a prioritized list from matter signals (rate-card violations, projected budget revision, cluster exposure, pending invoices). Demo-narrative matters MUST receive a curated override list to guarantee the demo script. Checkbox completion state is local to the browser session only and MUST NOT be persisted to any backend.

### Requirement Updates From Clarification

- **FR-025**: The Matter Detail page MUST render a "Open Matter in Passport — Budget Tab" deep-link button that targets `${VITE_PASSPORT_BASE_URL}/matter/{matterId}/budget`, opens in a new tab, and gracefully falls back to a placeholder URL when the env var is unset.
- **FR-026**: The Matter Detail page MUST render a Budget History card showing original budget, each revision (date, amount delta, reason, approver), current approved total, remaining balance at current burn, projected next-revision date, and a Reallocation Risk advisory when applicable.
- **FR-027**: For matters without seeded revisions, the Budget History card MUST render an empty state and MUST NOT generate synthetic revisions.
- **FR-028**: The Matter Detail page MUST render an Activity Timeline that displays the five event types defined in CL-009, in reverse-chronological order, with severity indicators consistent with the rest of the UI.
- **FR-029**: The Matter Detail page MUST render a Recommended Actions card containing a prioritized, numbered, checkbox-style list of actions derived by a deterministic rules engine, overridable by curated lists for demo-narrative matters, with checkbox state held only in the browser session.
- **FR-030**: The backend MUST NOT execute any Passport SQL Server query at runtime; the only data source for API responses MUST be local JSON seed files. Probe scripts under `backend/scripts/` MUST be removed.
