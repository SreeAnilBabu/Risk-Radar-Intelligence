# RiskRadar — Spec Kit Prompts Playbook

> Run these prompts **in order** in Copilot Chat inside the RiskRader workspace.
> Each step builds on the previous one. Do NOT skip steps.

---

## PROMPT 1: Constitution (Project Principles)

**Copy-paste this into Copilot Chat:**

```
@workspace /speckit.constitution

Create governing principles for RiskRadar — a real-time legal risk intelligence and weather-map platform built on top of Wolters Kluwer's Passport Enterprise Legal Management (ELM) system.

PROJECT CONTEXT:
- This is a WK Code Games 2026 hackathon project (Agentic Edition)
- Team of 6 people, 2.5 days to build, 7-minute pre-recorded demo + 5-minute Q&A
- Must use FAB Agent (WK's GenAI/Agentic AI platform) as the AI engine
- Target users: Corporate legal department leaders (General Counsels, CLOs, Legal Ops Directors)

PRINCIPLES TO ESTABLISH:

1. CODE QUALITY
   - TypeScript strict mode, no `any` types
   - React 18 with functional components and hooks only
   - Clean component hierarchy: Pages → Layouts → Features → UI Components
   - Maximum 200 lines per component file
   - Meaningful variable/function names, self-documenting code
   - ESLint + Prettier enforced

2. TESTING STANDARDS
   - Unit tests for utility functions and risk calculation logic
   - Component tests for critical UI interactions (map clicks, filter changes)
   - No E2E tests (hackathon scope — not enough time)
   - Test files co-located with source files (Component.test.tsx)

3. USER EXPERIENCE
   - Dark theme primary (legal/finance professional aesthetic)
   - Responsive but desktop-first (legal ops users are on desktop)
   - Map interactions must feel instant (<200ms response)
   - Loading skeletons for async data, never blank screens
   - Consistent color-coded risk levels: Green (Low) → Yellow (Medium) → Orange (High) → Red (Critical)
   - Framer Motion for smooth transitions, no jarring UI changes

4. PERFORMANCE
   - Map rendering under 2 seconds on initial load
   - Risk score calculations cached, not recalculated on every render
   - Lazy load non-critical components (settings, detailed reports)
   - Virtual scrolling for lists with 50+ items

5. ARCHITECTURE
   - Frontend: React 18 + TypeScript + Vite + Tailwind CSS
   - Mapping: Leaflet.js with react-leaflet wrapper
   - Charts: Recharts for data visualizations
   - Animations: Framer Motion
   - Backend: Node.js + Express (lightweight REST API)
   - AI: FAB Agent SDK for risk analysis, summarization, recommendations
   - Data: Mock JSON data simulating Passport database (no real DB for hackathon)
   - State: React Context + useReducer (no Redux — overkill for demo scope)

6. DEMO-FIRST DEVELOPMENT
   - Every feature must be visually demonstrable in the 7-minute demo
   - If a feature can't be shown in the demo, don't build it
   - Prioritize "wow factor" — animated map, real-time risk updates, AI-generated insights
   - Seed data must tell a compelling story (show realistic legal scenarios)

7. SECURITY & ACCESSIBILITY
   - No real credentials or API keys in code
   - Basic ARIA labels on interactive elements
   - Keyboard navigation for critical paths
   - Color-blind friendly palette (don't rely solely on red/green)

8. SCOPE GOVERNANCE
   - Mock data over real integrations
   - No authentication/login screen (waste of demo time)
   - No database migrations or ORM setup
   - No CI/CD pipeline
   - Focus: Map visualization + AI risk intelligence + Dashboard
```

---

## PROMPT 2: Specify (What To Build)

**After constitution is done, copy-paste this:**

```
@workspace /speckit.specify

Build RiskRadar — a real-time legal risk intelligence platform that gives corporate legal departments a "weather map" view of their legal risk landscape across jurisdictions, practice areas, and vendors.

PROBLEM STATEMENT:
Corporate General Counsels and Legal Operations Directors using Wolters Kluwer's Passport ELM system currently have no way to see their overall risk posture at a glance. They must dig through dozens of reports, spreadsheets, and individual matter records to understand where their biggest legal risks are. By the time they identify an emerging risk, it's often too late to act proactively. They need a single, visual, AI-powered command center that shows risk in real-time and tells them what to do about it.

TARGET USERS:
1. General Counsel (GC) — Needs board-ready risk overview, cares about strategic risk
2. Chief Legal Officer (CLO) — Needs cross-department risk visibility
3. Legal Operations Director — Needs operational risk metrics, vendor performance risks
4. Deputy General Counsel — Needs practice-area specific risk drill-downs

USER STORIES:

US-1: Risk Weather Map
As a General Counsel, I want to see an interactive world/US map showing color-coded risk levels by jurisdiction, so I can instantly identify which regions have escalating legal risk.
- Map shows jurisdictions (US states + major international regions) as colored regions
- Colors: Green (Low, score 0-25) → Yellow (Medium, 26-50) → Orange (High, 51-75) → Red (Critical, 76-100)
- Clicking a jurisdiction shows a popup with: risk score, top 3 risk factors, matter count, total spend, trend arrow (↑ rising, ↓ falling, → stable)
- Risk scores update in real-time as new data arrives
- Animated pulse effect on jurisdictions with critical alerts

US-2: AI Risk Briefing
As a CLO, I want an AI-generated daily risk briefing summarized in plain English, so I can quickly understand the top risks without reading individual reports.
- "Good morning" briefing card at top of dashboard
- AI summarizes: top 3 risks today, what changed since yesterday, recommended actions
- Written in executive language, not legal jargon
- Powered by FAB Agent (WK's AI platform)
- User can ask follow-up questions: "Tell me more about the California IP risk"

US-3: Risk Dashboard
As a Legal Ops Director, I want a dashboard with risk trend charts, top risk categories, and KPI cards, so I can track risk metrics over time.
- KPI Cards: Overall Risk Score, Active Matters, Total Legal Spend, Open Alerts count
- Risk Trend Chart: Line chart showing risk score over last 12 months
- Risk by Practice Area: Horizontal bar chart (IP, Employment, Regulatory, Contract, Litigation)
- Risk by Vendor: Top 5 vendors ranked by associated risk score
- Spend vs Risk Scatter Plot: Identifies high-spend-low-risk and low-spend-high-risk anomalies

US-4: Risk Alerts & Notifications
As a GC, I want real-time alerts when a jurisdiction's risk crosses a threshold or a new regulatory change impacts my portfolio, so I can act before problems escalate.
- Alert types: Threshold Breach (risk score crossed 75), Regulatory Change, Spend Anomaly, Deadline Risk
- Alert cards with severity badge, timestamp, affected jurisdiction, and AI-recommended action
- Mark as read, snooze, or escalate actions
- Alert bell icon with unread count badge in header

US-5: What-If Simulator
As a Deputy GC, I want to ask "what if" questions like "What happens to our risk if we lose the patent case in Texas?", so I can model risk scenarios before they happen.
- Natural language input box: user types a scenario
- FAB Agent analyzes the scenario and shows: projected risk score change, affected jurisdictions, financial impact estimate, recommended mitigations
- Side-by-side comparison: Current state vs Simulated state
- Animated transition showing risk map changing colors based on simulation

US-6: Risk Drill-Down
As a Legal Ops Director, I want to click on any risk indicator and drill down to see the underlying matters, vendors, timekeepers, and spend data, so I can understand the root cause.
- From map: click jurisdiction → see matters in that jurisdiction
- From dashboard: click practice area bar → see matters in that practice area
- Drill-down view shows: matter list table (sortable), related vendors, key timekeepers, budget vs actual spend, timeline
- Each matter links to a detail card with AI-generated risk summary

US-7: Natural Language Query
As a GC, I want to type questions like "Show me my riskiest jurisdictions for employment litigation" and get instant visual answers, so I can query my risk data conversationally.
- Search bar at top of every page
- FAB Agent interprets the query and filters/highlights the map and dashboard accordingly
- Example queries: "Which vendors have the highest risk?", "Compare California vs New York IP risk", "What's driving the risk increase in Q3?"
- Results shown both as text response and visual highlight on map/charts

ACCEPTANCE CRITERIA:
- Map loads in under 2 seconds with 50+ jurisdictions
- AI briefing generates in under 5 seconds
- What-if simulation produces results in under 8 seconds
- Dashboard shows at least 5 different chart types
- All risk scores calculated from underlying matter/spend/timeline data
- UI follows dark theme with WK-inspired color palette
- Works on Chrome/Edge desktop (no mobile requirement for demo)

NON-GOALS (out of scope):
- Real Passport database connection (use mock data)
- User authentication/authorization
- Email/Slack notification delivery
- PDF report export
- Multi-tenancy
- Mobile responsive design
- Automated data pipeline from Passport
```

---

## PROMPT 3: Clarify (Optional but Recommended)

**After specify is done:**

```
@workspace /speckit.clarify
```

> Copilot will ask you clarifying questions about ambiguous areas. Answer them to tighten the spec.

---

## PROMPT 4: Plan (How To Build It)

**After clarify is done, copy-paste this:**

```
@workspace /speckit.plan

Build RiskRadar using the following technical architecture and stack:

FRONTEND:
- React 18 with TypeScript (strict mode)
- Vite as build tool and dev server
- Tailwind CSS for styling (dark theme with custom WK-inspired palette)
- react-leaflet + Leaflet.js for interactive map
- Recharts for dashboard charts (line, bar, scatter, pie, area)
- Framer Motion for animations and transitions
- React Router v6 for client-side routing
- React Context + useReducer for state management

FRONTEND PAGES & ROUTES:
- / (Dashboard) — KPI cards, risk trend charts, AI briefing
- /map (Risk Map) — Full-screen interactive map with risk overlays
- /alerts (Alerts) — List of risk alerts with filters
- /simulator (What-If) — Scenario simulation interface
- /jurisdiction/:id (Drill-Down) — Jurisdiction detail with matters, vendors, spend

COMPONENT ARCHITECTURE:
- src/components/ui/ — Reusable primitives (Button, Card, Badge, Modal, Skeleton)
- src/components/map/ — RiskMap, JurisdictionPopup, RiskLegend, MapControls
- src/components/dashboard/ — KPICard, RiskTrendChart, PracticeAreaChart, VendorRiskChart, SpendScatter
- src/components/alerts/ — AlertCard, AlertList, AlertFilters
- src/components/simulator/ — SimulatorInput, SimulationResult, RiskComparison
- src/components/ai/ — AIBriefing, ChatInterface, QueryBar
- src/components/layout/ — Header, Sidebar, PageLayout
- src/pages/ — DashboardPage, MapPage, AlertsPage, SimulatorPage, DrillDownPage

BACKEND:
- Node.js 20 + Express.js
- REST API serving mock data as JSON
- Separate route files per domain: /api/risks, /api/matters, /api/jurisdictions, /api/alerts, /api/vendors
- FAB Agent integration endpoint: /api/ai/briefing, /api/ai/query, /api/ai/simulate
- CORS enabled for local dev (frontend on :5173, backend on :3001)
- No database — read from JSON seed files in /data/seeds/

API ENDPOINTS:
- GET /api/risks — All risk scores by jurisdiction
- GET /api/risks/:jurisdictionId — Risk detail for one jurisdiction
- GET /api/risks/trends — Historical risk scores (12 months)
- GET /api/matters — All matters with filters (jurisdiction, practice area, status)
- GET /api/matters/:id — Single matter detail
- GET /api/jurisdictions — All jurisdictions with metadata
- GET /api/alerts — All alerts (filterable by type, severity, read/unread)
- PATCH /api/alerts/:id — Update alert (mark read, snooze, escalate)
- GET /api/vendors — Vendor list with risk associations
- POST /api/ai/briefing — Generate AI risk briefing
- POST /api/ai/query — Natural language query processing
- POST /api/ai/simulate — What-if scenario simulation

DATA MODEL (Mock Data):
- Jurisdictions: id, name, code, region, coordinates, riskScore, riskTrend, matterCount, totalSpend
- Matters: id, title, jurisdictionId, practiceArea, status, vendor, budget, actualSpend, riskScore, openDate, deadlines
- Vendors: id, name, matterCount, totalBilled, avgRiskScore, performanceRating
- Alerts: id, type, severity, jurisdictionId, title, description, recommendation, timestamp, isRead
- RiskScores: jurisdictionId, date, score, factors[]
- Timekeepers: id, name, vendorId, rate, matterId, hoursLogged

MOCK DATA REQUIREMENTS:
- 50 US states + 10 international jurisdictions (UK, Germany, France, Japan, China, Brazil, India, Australia, Canada, Singapore)
- 150 matters spread across jurisdictions and practice areas
- 20 law firm vendors with varying risk profiles
- 50 alerts (mix of threshold breaches, regulatory changes, spend anomalies)
- 12 months of historical risk score data for trend charts
- Data must tell a demo story: California and New York are high risk, Texas has a rising trend, Singapore is stable low risk

FAB AGENT INTEGRATION:
- FAB Agent is WK's GenAI platform — use it via REST API calls
- For the hackathon demo, mock the FAB Agent responses with realistic pre-crafted AI text
- AI briefing: Pre-written morning briefing that references actual mock data
- AI query: Pattern-match common questions to pre-crafted responses
- AI simulator: Pre-calculated scenario impacts stored as JSON
- Make it look real-time even though responses are mocked — add 1-2 second artificial delay with loading animation

PROJECT STRUCTURE:
RiskRadar/
├── frontend/               # React + Vite app
│   ├── src/
│   │   ├── components/     # Organized by feature
│   │   ├── pages/          # Route pages
│   │   ├── hooks/          # Custom hooks
│   │   ├── context/        # React Context providers
│   │   ├── types/          # TypeScript interfaces
│   │   ├── utils/          # Helper functions
│   │   ├── data/           # Client-side mock data (if needed)
│   │   └── styles/         # Tailwind config, global styles
│   ├── public/
│   ├── index.html
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   └── package.json
├── backend/                # Express API
│   ├── src/
│   │   ├── routes/         # API route handlers
│   │   ├── services/       # Business logic
│   │   ├── middleware/     # CORS, error handling
│   │   └── types/          # Shared types
│   ├── data/
│   │   └── seeds/          # Mock JSON data files
│   ├── tsconfig.json
│   └── package.json
├── specs/                  # Spec Kit artifacts (auto-managed)
├── .specify/               # Spec Kit config
├── .github/                # Copilot agents
└── docs/                   # Documentation
```

---

## PROMPT 5: Tasks (Generate Task Breakdown)

**After plan is done:**

```
@workspace /speckit.tasks
```

> Spec Kit will auto-generate an ordered task list from your plan.
> Review the tasks.md file it creates — reorder or remove if needed.

---

## PROMPT 6: Implement (Build Everything)

**After reviewing tasks:**

```
@workspace /speckit.implement
```

> This is where Copilot reads all specs, plan, and tasks — then generates the actual code.
> It will scaffold the project, install dependencies, create components, write the backend, seed the data.
> This step takes the longest. Monitor progress and fix issues as they come up.

---

## QUICK REFERENCE

| Order | Command | Time Estimate | What It Creates |
|-------|---------|---------------|-----------------|
| 1 | /speckit.constitution | 2 min | .specify/memory/constitution.md |
| 2 | /speckit.specify | 3 min | .specify/specs/001-riskradar/spec.md |
| 3 | /speckit.clarify | 5 min | Updates spec.md with clarifications |
| 4 | /speckit.plan | 5 min | plan.md, data-model.md, research.md, api-spec |
| 5 | /speckit.tasks | 2 min | tasks.md with ordered task list |
| 6 | /speckit.implement | 30+ min | Entire project code! |

---

## NOTES
- If any step fails, re-read the output and fix before moving on
- You can always re-run a step to refine it
- After /speckit.implement, test with: cd frontend && npm run dev
