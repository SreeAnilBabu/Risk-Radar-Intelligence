# Quickstart: RiskRadar Risk Intelligence

## Purpose

Stand up the hackathon demo stack locally and verify all required routes/endpoints, clarified behaviors (FR-021 to FR-024), and performance/UX budgets.

## Prerequisites

- Node.js 20.x
- npm 10+
- Chrome or Edge (desktop)

## Workspace Layout

- frontend: React 18 + TypeScript strict + Vite + Tailwind + Leaflet + Recharts + Framer Motion
- backend: Node.js 20 + Express REST API with mock JSON data

## 1. Install Dependencies

Backend:

```bash
cd backend
npm install
```

Frontend:

```bash
cd frontend
npm install
```

## 2. Start Services

Backend (default http://localhost:4000):

```bash
cd backend
npm run dev
```

Frontend (default http://localhost:5173):

```bash
cd frontend
npm run dev
```

## 3. Validate Required Routes

Open the frontend and confirm:

- / (dashboard)
- /map
- /alerts
- /simulator
- /jurisdiction/:id

## 4. Validate Required API Endpoints

Expected endpoint set:

- GET /api/risks
- GET /api/risks/:jurisdictionId
- GET /api/risks/trends
- GET /api/matters
- GET /api/matters/:id
- GET /api/jurisdictions
- GET /api/alerts
- PATCH /api/alerts/:id
- GET /api/vendors
- POST /api/ai/briefing
- POST /api/ai/query
- POST /api/ai/simulate

Example checks:

```bash
curl http://localhost:4000/api/risks
curl http://localhost:4000/api/risks/US-CA
curl http://localhost:4000/api/risks/trends
curl http://localhost:4000/api/alerts
curl -X PATCH http://localhost:4000/api/alerts/alert-001 -H "Content-Type: application/json" -d '{"action":"escalate"}'
curl -X POST http://localhost:4000/api/ai/briefing -H "Content-Type: application/json" -d '{"focus":"daily"}'
```

## 5. Clarification Behavior Validation

### FR-021 Fixed weighted risk formula

- Verify risk score calculation uses fixed weights only.
- Confirm no UI for weight editing exists.
- Run unit tests for risk formula and clamp behavior.

### FR-022 Auto refresh every 15 seconds

- On dashboard and map, confirm data refresh tick updates at 15-second cadence.
- Confirm interaction remains smooth during refresh.

### FR-023 Unsupported simulation fallback

- Submit unsupported prompt in simulator.
- Confirm response includes nearest preset and visible disclaimer.

### FR-024 Escalation behavior

- Escalate an alert from feed.
- Confirm item moves to pinned high-priority queue in-app.
- Confirm no external notification side effects.

### Narrative baseline

- Confirm default seed state: CA and NY critical, TX rising.
- Confirm dashboard/map/alerts/AI briefing all reinforce same storyline.

## 6. Test Commands

Backend tests:

```bash
cd backend
npm run test
```

Frontend tests:

```bash
cd frontend
npm run test
```

Suggested minimum suites:
- Risk formula unit tests
- Trend derivation and threshold mapping tests
- Map click + filter component tests
- Alert status transition tests
- API contract tests for required endpoints

## 7. Performance and UX Budget Checks

- Initial map load: <2s to usable view.
- Interaction latency: <200ms p95 for map/filter actions.
- AI briefing response: <5s p95.
- Simulation response: <8s p95.

Manual profiling checklist:
- Use browser Performance panel for map load and interactions.
- Record 20 interactions for p95 approximation.
- Log backend route timings for AI endpoints.

## 8. Accessibility and Security Baseline

- Keyboard navigation works for map controls, alert actions, simulator actions.
- ARIA labels present on interactive controls.
- Non-color risk indicators present alongside color.
- No real secrets in code, config, or mock payloads.

## 9. Demo Rehearsal Flow (7 minutes)

1. Start on dashboard: explain overall risk, KPIs, trend cards.
2. Move to /map: show CA and NY critical, TX rising trajectory.
3. Drill into /jurisdiction/US-CA: inspect matter and vendor drivers.
4. Open /alerts: escalate one critical alert into priority queue.
5. Open /simulator: run supported scenario, then unsupported prompt fallback.
6. Trigger AI briefing and ask follow-up query for executive narrative close.
