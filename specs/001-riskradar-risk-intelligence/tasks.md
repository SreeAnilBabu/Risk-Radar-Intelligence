# Tasks: RiskRadar Risk Intelligence Platform

**Input**: Design documents from `/specs/001-riskradar-risk-intelligence/`
**Prerequisites**: `plan.md` (required), `spec.md` (required), `research.md`, `data-model.md`, `contracts/openapi.yaml`, `quickstart.md`

**Tests**: Include only constitution-approved tests: unit tests and critical component tests. Exclude E2E tests.

**Organization**: Tasks are grouped by user story to support independent implementation and testing while fitting a 6-person, 2.5-day hackathon sequence.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: User story label (`[US1]` ... `[US7]`) for story-phase tasks only
- Every task includes exact path(s) under `frontend/` and `backend/`

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Initialize frontend/backend workspaces and baseline tooling for strict TypeScript delivery.

- [X] T001 Initialize backend workspace dependencies and scripts in `backend/package.json`
- [X] T002 [P] Initialize frontend workspace dependencies and scripts in `frontend/package.json`
- [X] T003 Configure backend TypeScript strict compiler settings in `backend/tsconfig.json`
- [X] T004 [P] Configure frontend TypeScript strict compiler settings in `frontend/tsconfig.json`
- [X] T005 Create backend app/server bootstrap in `backend/src/app.ts` and `backend/src/server.ts`
- [X] T006 [P] Create frontend app bootstrap/router shell in `frontend/src/main.tsx` and `frontend/src/app/router.tsx`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared platform foundations required before any user story implementation.

**Critical**: Complete this phase before starting user stories.

- [X] T007 Define shared backend domain types aligned to contract schemas in `backend/src/types/domain.ts`
- [X] T008 [P] Define frontend API/domain types aligned to contract schemas in `frontend/src/types/domain.ts`
- [X] T009 Implement backend mock data loaders and in-memory cache in `backend/src/data/loaders.ts`
- [X] T010 [P] Implement frontend API client and endpoint wrappers in `frontend/src/services/apiClient.ts` and `frontend/src/services/endpoints/index.ts`
- [X] T011 Implement FR-021 risk score utility (fixed weighted normalized formula + clamp) in `backend/src/services/riskScore.service.ts`
- [X] T012 Implement refresh tick foundation for FR-022 (15-second polling hooks) in `frontend/src/app/state/refreshContext.tsx`
- [X] T013 Implement base accessibility primitives (keyboard focus + ARIA helpers) in `frontend/src/components/a11y/FocusRing.tsx` and `frontend/src/components/a11y/VisuallyHidden.tsx`
- [X] T014 Implement reusable loading/error skeleton primitives in `frontend/src/components/feedback/LoadingSkeleton.tsx` and `frontend/src/components/feedback/ErrorState.tsx`

**Checkpoint**: Shared contracts, mock data plumbing, risk scoring core, and refresh foundation are ready.

---

## Phase 3: User Story 1 - Risk Weather Map Overview (Priority: P1) MVP

**Goal**: Deliver jurisdiction-level map visualization with accessible severity semantics and drill-in summary.

**Independent Test**: Load `/map`, validate legend/non-color indicators, click jurisdiction, and verify risk/trend/factors/spend context.

### Tests (Unit + Critical Component)

- [X] T015 [P] [US1] Add unit tests for FR-021 formula thresholds and clamping in `backend/tests/unit/riskScore.service.test.ts`
- [X] T016 [P] [US1] Add component test for map click -> detail panel rendering in `frontend/tests/component/map/RiskMapPage.test.tsx`

### Implementation

- [X] T017 [P] [US1] Implement risks list/detail routes in `backend/src/api/risks.routes.ts`
- [X] T018 [P] [US1] Implement jurisdictions route in `backend/src/api/jurisdictions.routes.ts`
- [X] T019 [US1] Implement map page shell and legend with non-color indicators in `frontend/src/pages/RiskMapPage.tsx`
- [X] T020 [P] [US1] Implement leaflet overlay and severity styling in `frontend/src/features/map/RiskMapCanvas.tsx`
- [X] T021 [US1] Implement jurisdiction detail side panel in `frontend/src/features/map/JurisdictionDetailPanel.tsx`
- [X] T022 [US1] Wire map data hooks with FR-022 refresh integration in `frontend/src/features/map/useRiskMapData.ts`

**Checkpoint**: US1 is independently demoable and testable.

---

## Phase 4: User Story 2 - Executive AI Risk Briefing (Priority: P1)

**Goal**: Provide deterministic executive daily briefing plus contextual follow-up Q&A.

**Independent Test**: Generate briefing and ask follow-up question, validating narrative consistency with seeded risk storyline.

### Tests (Unit + Critical Component)

- [X] T023 [P] [US2] Add unit tests for briefing narrative assembly in `backend/tests/unit/aiBriefingFormatter.test.ts`
- [X] T024 [P] [US2] Add component test for briefing request and follow-up interaction in `frontend/tests/component/briefing/BriefingPanel.test.tsx`

### Implementation

- [X] T025 [P] [US2] Implement AI briefing and query routes in `backend/src/api/ai.routes.ts`
- [X] T026 [P] [US2] Implement deterministic AI mock service adapters in `backend/src/services/aiMock.service.ts`
- [X] T027 [US2] Implement briefing panel UI and follow-up input in `frontend/src/features/briefing/BriefingPanel.tsx`
- [X] T028 [US2] Wire briefing/query API integrations and error states in `frontend/src/features/briefing/briefing.service.ts`

**Checkpoint**: US2 works independently with stable narrative outputs.

---

## Phase 5: User Story 3 - Legal Ops Risk Dashboard (Priority: P1)

**Goal**: Deliver KPI cards and multi-view risk analytics dashboard.

**Independent Test**: Open `/`, confirm KPI cards and all required chart views align with seeded data.

### Tests (Unit + Critical Component)

- [X] T029 [P] [US3] Add unit tests for dashboard KPI aggregation/selectors in `frontend/tests/unit/dashboardSelectors.test.ts`
- [X] T030 [P] [US3] Add component test for dashboard chart rendering and filter interaction in `frontend/tests/component/dashboard/DashboardPage.test.tsx`

### Implementation

- [X] T031 [P] [US3] Implement trends and vendors routes for dashboard datasets in `backend/src/api/vendors.routes.ts` and `backend/src/services/trends.service.ts`
- [X] T032 [US3] Implement dashboard page composition in `frontend/src/pages/DashboardPage.tsx`
- [X] T033 [P] [US3] Implement KPI cards and summary row in `frontend/src/features/dashboard/KpiCards.tsx`
- [X] T034 [P] [US3] Implement trend and category charts in `frontend/src/features/dashboard/TrendAndCategoryCharts.tsx`
- [X] T035 [US3] Implement vendor concentration and spend-vs-risk anomaly panels in `frontend/src/features/dashboard/VendorAndAnomalyPanels.tsx`

**Checkpoint**: US3 is independently demoable with complete analytics surfaces.

---

## Phase 6: User Story 4 - Real-Time Risk Alerts (Priority: P2)

**Goal**: Deliver alert lifecycle management with in-app escalation queue behavior.

**Independent Test**: Trigger/inspect alerts, perform read/snooze/escalate actions, verify queue ordering and counters update.

### Tests (Unit + Critical Component)

- [X] T036 [P] [US4] Add unit tests for alert status transition rules and FR-024 queue ordering in `backend/tests/unit/alertsTransitions.test.ts`
- [X] T037 [P] [US4] Add component test for alert lifecycle actions and badge updates in `frontend/tests/component/alerts/AlertsPage.test.tsx`

### Implementation

- [X] T038 [P] [US4] Implement alerts list and patch routes in `backend/src/api/alerts.routes.ts`
- [X] T039 [US4] Implement alert queue/counter service logic (read/snooze/escalate) in `backend/src/services/alerts.service.ts`
- [X] T040 [US4] Implement alerts page shell and status filter controls in `frontend/src/pages/AlertsPage.tsx`
- [X] T041 [P] [US4] Implement alerts feed list with pinned escalated queue section in `frontend/src/features/alerts/AlertsFeed.tsx`
- [X] T042 [US4] Implement alert action handlers and optimistic UI updates in `frontend/src/features/alerts/useAlertActions.ts`

**Checkpoint**: US4 independently demonstrates proactive alert operations.

---

## Phase 7: User Story 5 - What-If Risk Simulator (Priority: P2)

**Goal**: Deliver scenario simulation with before/after comparison and FR-023 unsupported fallback behavior.

**Independent Test**: Submit supported and unsupported prompts, verify projected deltas, mitigations, and fallback disclaimer.

### Tests (Unit + Critical Component)

- [X] T043 [P] [US5] Add unit tests for nearest-preset matching and approximation flagging (FR-023) in `backend/tests/unit/simulationMatcher.test.ts`
- [X] T044 [P] [US5] Add component test for simulator compare view and disclaimer rendering in `frontend/tests/component/simulator/SimulatorPage.test.tsx`

### Implementation

- [X] T045 [P] [US5] Implement simulation endpoint behavior in `backend/src/api/ai.routes.ts`
- [X] T046 [US5] Implement preset matcher and result builder service in `backend/src/services/simulation.service.ts`
- [X] T047 [US5] Implement simulator page shell and prompt form in `frontend/src/pages/SimulatorPage.tsx`
- [X] T048 [P] [US5] Implement before/after comparison visualization in `frontend/src/features/simulator/SimulationComparison.tsx`
- [X] T049 [US5] Implement simulator API integration and fallback disclaimer banner in `frontend/src/features/simulator/useSimulation.ts`

**Checkpoint**: US5 independently supports strategic planning workflows.

---

## Phase 8: User Story 6 - Risk Drill-Down Investigation (Priority: P2)

**Goal**: Provide jurisdiction drill-down to underlying matters and vendor/spend drivers.

**Independent Test**: Navigate to `/jurisdiction/:id`, validate sortable matter list and vendor/spend context panels.

### Tests (Unit + Critical Component)

- [X] T050 [P] [US6] Add component test for drill-down sorting and detail panels in `frontend/tests/component/jurisdiction/JurisdictionPage.test.tsx`

### Implementation

- [X] T051 [P] [US6] Implement matters list/detail routes in `backend/src/api/matters.routes.ts`
- [X] T052 [US6] Implement jurisdiction drill-down page and section layout in `frontend/src/pages/JurisdictionPage.tsx`
- [X] T053 [P] [US6] Implement sortable matter table component in `frontend/src/features/drilldown/MatterTable.tsx`
- [X] T054 [P] [US6] Implement vendor/spend context panel in `frontend/src/features/drilldown/VendorSpendPanel.tsx`
- [X] T055 [US6] Implement drill-down data hooks integrating risks/matters/vendors in `frontend/src/features/drilldown/useJurisdictionDrilldown.ts`

**Checkpoint**: US6 independently enables root-cause investigation.

---

## Phase 9: User Story 7 - Natural Language Risk Query (Priority: P3)

**Goal**: Support conversational risk Q&A with visual emphasis mapping.

**Independent Test**: Submit supported and ambiguous queries, validate narrative response and highlight behavior/refinement prompt.

### Tests (Unit + Critical Component)

- [X] T056 [P] [US7] Add component test for global query submit, refinement prompt, and highlight callback in `frontend/tests/component/query/GlobalQueryBar.test.tsx`

### Implementation

- [X] T057 [P] [US7] Implement global query interpretation and response mapping in `backend/src/services/queryInterpreter.service.ts`
- [X] T058 [US7] Extend AI query route for ambiguity/refinement responses in `backend/src/api/ai.routes.ts`
- [X] T059 [US7] Implement global query bar entry point in `frontend/src/features/briefing/GlobalQueryBar.tsx`
- [X] T060 [US7] Wire query result highlight bridge to map/dashboard state in `frontend/src/app/state/queryHighlightContext.tsx`

**Checkpoint**: US7 is independently demonstrable as an enhancement story.

---

## Phase 10: Polish & Cross-Cutting Concerns

**Purpose**: Final integration hardening, performance/accessibility validation, and demo narrative consistency.

- [X] T061 [P] Validate FR-022 refresh cadence integration across dashboard/map/alerts in `frontend/src/app/state/refreshContext.tsx` and `backend/src/services/refreshTicker.ts`
- [X] T062 [P] Optimize map and chart rendering against performance budgets (<2s load, <200ms p95 interactions) in `frontend/src/features/map/RiskMapCanvas.tsx` and `frontend/src/features/dashboard/TrendAndCategoryCharts.tsx`
- [X] T063 Enforce accessibility pass for critical controls (keyboard + ARIA + non-color cues) in `frontend/src/pages/RiskMapPage.tsx`, `frontend/src/pages/AlertsPage.tsx`, and `frontend/src/pages/SimulatorPage.tsx`
- [X] T064 Verify seeded narrative consistency (CA/NY critical, TX rising) across backend datasets/services in `backend/src/data/jurisdictions.json`, `backend/src/data/alerts.json`, and `backend/src/services/aiMock.service.ts`
- [ ] T065 Run and fix unit/component suites for frontend/backend in `frontend/tests/` and `backend/tests/`
- [X] T066 Update delivery notes and demo rehearsal checklist in `specs/001-riskradar-risk-intelligence/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- Setup (Phase 1): start immediately.
- Foundational (Phase 2): depends on Phase 1 and blocks all user stories.
- User stories (Phases 3-9): all depend on Phase 2.
- Polish (Phase 10): depends on completion of targeted stories.

### User Story Dependencies

- US1, US2, US3 (all P1): can run in parallel after Phase 2, with US1 prioritized as MVP slice.
- US4, US5, US6 (P2): start after at least one P1 story is integrated; can run in parallel.
- US7 (P3): starts after AI/query foundations from US2 are stable.

### Hackathon Staffing Sequence (6 People, 2.5 Days)

- Track A (2 engineers): US1 map + performance polish.
- Track B (1 engineer): US3 dashboard.
- Track C (1 engineer): US4 alerts + US6 drill-down.
- Track D (1 engineer): backend APIs/services for US2/US5/US7.
- Track E (1 engineer): unit/component test coverage and integration support across phases.

## Parallel Execution Examples

### After Foundational Checkpoint

- [ ] `T017`, `T018`, `T020` (US1 backend/frontend split)
- [ ] `T025`, `T026`, `T027` (US2 backend/frontend split)
- [ ] `T031`, `T033`, `T034` (US3 backend/frontend split)

### P2 Parallel Block

- [ ] `T038`, `T041` (US4)
- [ ] `T045`, `T048` (US5)
- [ ] `T051`, `T053`, `T054` (US6)

## Implementation Strategy

### MVP First

1. Complete Phases 1-2.
2. Complete Phase 3 (US1) and one P1 support story (US2 or US3).
3. Validate with unit/component tests and quickstart checks.

### Incremental Delivery

1. P1 stories (US1-3) produce demo core.
2. P2 stories (US4-6) add operational depth.
3. P3 story (US7) adds conversational enhancement.
4. Finish with Phase 10 polish and rehearsal readiness checks.

## Scope Guardrails (Must Preserve)

- Do not add auth/login tasks.
- Do not add database migration/ORM tasks.
- Do not add CI/CD pipeline tasks.
- Do not add E2E testing tasks.
