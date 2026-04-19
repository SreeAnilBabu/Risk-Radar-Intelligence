# Implementation Plan: RiskRadar Risk Intelligence Platform

**Branch**: `001-pre-specify-branch` | **Date**: 2026-04-20 | **Spec**: `specs/001-riskradar-risk-intelligence/spec.md`  
**Input**: Feature specification from `specs/001-riskradar-risk-intelligence/spec.md`

## Summary

Deliver a demo-first legal risk intelligence web app that combines a real-time risk map, executive dashboard, alerts feed, what-if simulator, and AI briefing/query experiences using mocked data only. Implementation uses a React 18 + TypeScript strict frontend and Node.js 20 + Express backend, with fixed weighted risk scoring (FR-021), 15-second auto-refresh (FR-022), unsupported simulation fallback behavior (FR-023), and in-app escalation queue semantics (FR-024). Work is sequenced for a 6-person team over 2.5 days with parallel frontend/backend/testing streams and a dedicated demo narrative track.

## Technical Context

**Language/Version**: TypeScript 5.x strict (frontend and backend), Node.js 20 runtime  
**Primary Dependencies**: React 18, Vite, Tailwind CSS, Leaflet.js, react-leaflet, Recharts, Framer Motion, Express, Zod (runtime validation), Vitest, React Testing Library, Supertest  
**Storage**: Mock JSON files in repository; in-memory runtime cache only; no database  
**Testing**: Vitest (unit + component), Supertest (API contract/integration-style), no E2E for hackathon scope  
**Target Platform**: Desktop Chrome/Edge on Windows/macOS developer machines
**Project Type**: Web application with separated frontend and backend workspaces  
**Performance Goals**: Initial map usable <2s; interaction latency <200ms p95; AI briefing <5s p95; simulation <8s p95  
**Constraints**: No auth; no real Passport DB; no external notifications; no CI/CD expansion; no secrets; keyboard and ARIA coverage for critical paths  
**Scale/Scope**: Demo dataset for 50+ jurisdictions, 200-500 matters, 50-100 alerts, and narrative baseline (CA/NY critical, TX rising)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Pre-Research Gate

- Code Quality: PASS. TypeScript strict, React functional components/hooks, and Pages -> Layouts -> Features -> UI hierarchy mandated in architecture.
- Testing: PASS. Unit tests for risk utilities + component tests for map clicks/filter interactions explicitly scoped; no E2E planned.
- UX: PASS. Dark-theme-first, skeleton loading for async surfaces, and non-color risk encodings included in design baseline.
- Performance: PASS. Concrete budgets included from spec and implementation constraints; caching/staged loading required.
- Architecture: PASS. Stack exactly matches constitution-approved technologies and mock-data boundary.
- Demo-first: PASS. All routes and required API flows map to visible demo segments.
- Security + Accessibility: PASS. No secrets, keyboard navigation and ARIA included in acceptance and quickstart checks.
- Scope Governance: PASS. Explicit exclusions retained (auth, DB migrations/ORM, CI/CD).

### Post-Design Gate (After Phase 1 Outputs)

- Code Quality: PASS. Data model and contracts enforce typed DTOs and reducer-safe state transitions.
- Testing: PASS. quickstart includes required test suites and ownership by lane.
- UX: PASS. contract and model include severity semantics + escalation queue behavior.
- Performance: PASS. refresh cadence, response-time budgets, and client caching strategy documented.
- Architecture: PASS. API contract and project structure remain within approved boundaries.
- Demo-first: PASS. Implementation sequence includes rehearsal checkpoints and scripted narrative.
- Security + Accessibility: PASS. No secret-bearing endpoints; alert/simulator/query flows include accessible interaction requirements.
- Scope Governance: PASS. No out-of-scope systems introduced in plan artifacts.

## Project Structure

### Documentation (this feature)

```text
specs/001-riskradar-risk-intelligence/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── openapi.yaml
└── checklists/
```

### Source Code (repository root)

```text
backend/
├── package.json
├── tsconfig.json
├── src/
│   ├── app.ts
│   ├── server.ts
│   ├── api/
│   │   ├── risks.routes.ts
│   │   ├── matters.routes.ts
│   │   ├── jurisdictions.routes.ts
│   │   ├── alerts.routes.ts
│   │   ├── vendors.routes.ts
│   │   └── ai.routes.ts
│   ├── services/
│   │   ├── riskScore.service.ts
│   │   ├── trends.service.ts
│   │   ├── alerts.service.ts
│   │   └── aiMock.service.ts
│   ├── data/
│   │   ├── jurisdictions.json
│   │   ├── matters.json
│   │   ├── alerts.json
│   │   ├── vendors.json
│   │   └── trends.json
│   └── types/
└── tests/
    ├── unit/
    └── contract/

frontend/
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.ts
├── src/
│   ├── main.tsx
│   ├── app/
│   │   ├── router.tsx
│   │   ├── providers/
│   │   └── state/
│   ├── pages/
│   │   ├── DashboardPage.tsx
│   │   ├── RiskMapPage.tsx
│   │   ├── AlertsPage.tsx
│   │   ├── SimulatorPage.tsx
│   │   └── JurisdictionPage.tsx
│   ├── layouts/
│   ├── features/
│   │   ├── map/
│   │   ├── alerts/
│   │   ├── simulator/
│   │   ├── briefing/
│   │   └── dashboard/
│   ├── components/
│   ├── services/
│   │   ├── apiClient.ts
│   │   └── endpoints/
│   ├── styles/
│   └── test/
└── tests/
    ├── unit/
    └── component/
```

**Structure Decision**: Web application split into `frontend` and `backend` to maximize 6-person parallelism and isolate API mocking from UI iteration speed.

## Phase 0: Research Plan and Outcomes

- Risk scoring model: Use deterministic weighted normalized formula from FR-021 to keep stable demo outputs and enable testable assertions.
- Refresh cadence strategy: Polling every 15 seconds with stale-while-refresh UI state to avoid jarring transitions.
- Unsupported simulation handling: Fallback-to-nearest preset by similarity score with explicit approximation disclaimer banner.
- Escalation semantics: In-app priority queue only, represented as alert status and pinned ordering in feed.
- AI integration: FAB Agent SDK integration points as service adapters; mock deterministic response fixtures for hackathon reliability.

Research details are captured in `research.md`.

## Phase 1: Design Outputs

- Data model definitions and relationships: `data-model.md`
- API contracts for all required endpoints: `contracts/openapi.yaml`
- Local run/test/demo flow with performance and UX checks: `quickstart.md`

## Phase 2: Implementation Sequencing (6 People, 2.5 Days)

### Team Lanes

- Lane A (2 engineers): Frontend map, routing, layout, interaction performance.
- Lane B (1 engineer): Dashboard charts, KPI cards, trends and anomalies.
- Lane C (1 engineer): Alerts feed, escalation queue behavior, drill-down page.
- Lane D (1 engineer): Backend API contracts, mock data services, AI mock endpoints.
- Lane E (1 engineer): Test harness, risk formula unit tests, component and API contract tests, performance instrumentation.

### Timeboxed Sequence

1. Day 1 Morning (0-4h): Scaffold frontend/backend workspaces, strict TS configs, shared types, API skeletons, route placeholders.
2. Day 1 Midday (4-8h): Implement mock data loading, FR-021 risk formula service, `/api/risks*`, `/api/jurisdictions`, base map with legend + non-color indicators.
3. Day 1 Evening (8-12h): Dashboard KPIs/charts, matters/vendors endpoints, first-pass alerts page with status transitions.
4. Day 2 Morning (12-16h): AI briefing/query/simulate endpoints with mocked narratives; simulator page with unsupported fallback disclaimer; 15-second refresh loop across dashboard/map.
5. Day 2 Midday (16-20h): Drill-down page `/jurisdiction/:id`, alert escalation queue pinning and counters, interaction animation pass with Framer Motion.
6. Day 2 Evening (20-24h): Test completion (unit/component/contract), p95 timing checks, map initial load optimization, bug triage.
7. Day 3 Half-Day (24-30h): Demo script hardening, seeded narrative tuning (CA/NY critical, TX rising), rehearse 7-minute flow, final polish.

### Definition of Done Gates

1. Functional: All required routes and endpoints implemented and demo-visible.
2. Performance: Budgets met for map load, interaction p95, briefing p95, simulation p95.
3. Quality: No TypeScript `any`; tests green for risk logic + critical interactions + API contracts.
4. Constitution: No out-of-scope features introduced; accessibility baseline verified on critical flows.

## Complexity Tracking

No constitution violations identified; complexity exceptions are not required.
