<!--
Sync Impact Report
- Version change: template-placeholder -> 1.0.0
- Modified principles:
	- Principle slot 1 -> I. Code Quality Discipline
	- Principle slot 2 -> II. Testing Standards for Demo Reliability
	- Principle slot 3 -> III. User Experience and Interaction Quality
	- Principle slot 4 -> IV. Performance Budgets
	- Principle slot 5 -> V. Architecture and Platform Boundaries
	- Added: VI. Demo-First Development
	- Added: VII. Security and Accessibility Baseline
	- Added: VIII. Scope Governance and Delivery Focus
- Added sections:
	- Technical and Delivery Constraints
	- Workflow and Quality Gates
- Removed sections:
	- None
- Templates requiring updates:
	- .specify/templates/plan-template.md: ✅ updated
	- .specify/templates/spec-template.md: ✅ updated
	- .specify/templates/tasks-template.md: ✅ updated
	- .specify/templates/commands/*.md: ⚠ pending (directory not present)
- Follow-up TODOs:
	- None
-->

# RiskRadar Constitution

## Core Principles

### I. Code Quality Discipline
All frontend code MUST use TypeScript strict mode with zero `any` usage. React code
MUST use React 18 functional components and hooks only. Components MUST follow this
hierarchy: Pages -> Layouts -> Features -> UI Components. Each component file MUST
stay at or below 200 lines (excluding comments and type-only imports). Naming for
files, symbols, and functions MUST be explicit and self-documenting. ESLint and
Prettier MUST be enabled and passing before merge.

Rationale: In a 2.5-day hackathon, strict and consistent code prevents regressions,
reduces review overhead, and keeps handoffs fast across a 6-person team.

### II. Testing Standards for Demo Reliability
Unit tests MUST cover utilities and all risk-calculation logic. Component tests MUST
cover critical interactions, including map clicks and filter changes. End-to-end
tests MUST NOT be added for this hackathon scope. Tests MUST be co-located with
source files using `Component.test.tsx` naming (or equivalent per file under test).

Rationale: Fast, targeted tests maximize confidence for demo-critical flows without
spending limited time on heavy test infrastructure.

### III. User Experience and Interaction Quality
The primary visual mode MUST be dark theme with a professional legal/finance
aesthetic. The experience MUST be responsive with desktop-first optimization.
Map interactions MUST respond within 200ms for user-triggered actions. Async states
MUST show loading skeletons; blank screens are prohibited. Risk levels MUST use a
consistent scale: Green (Low), Yellow (Medium), Orange (High), Red (Critical).
Transitions MUST use Framer Motion and avoid jarring visual changes.

Rationale: Executives and legal operations leaders need immediate clarity and trust;
polished interactions are central to perceived product credibility.

### IV. Performance Budgets
Initial map render MUST complete in under 2 seconds on a standard developer laptop.
Risk score calculations MUST be cached and MUST NOT re-run on every render when
inputs are unchanged. Non-critical features (settings, detailed reports) MUST be
lazy-loaded. Lists with 50 or more rows/items MUST use virtual scrolling.

Rationale: Demo quality depends on smooth interaction under real presentation timing
constraints and limited compute resources.

### V. Architecture and Platform Boundaries
The stack is fixed unless amended through governance: React 18 + TypeScript + Vite +
Tailwind CSS (frontend), Leaflet.js + react-leaflet (mapping), Recharts (charts),
Framer Motion (animation), Node.js + Express REST API (backend), and FAB Agent SDK
for AI analysis/summarization/recommendations. Data MUST use mock JSON simulating
Passport DB context; no real database integration is allowed. Frontend state MUST
use React Context + useReducer; Redux is prohibited.

Rationale: Fixed architecture avoids decision churn and keeps implementation aligned
with hackathon constraints and judging goals.

### VI. Demo-First Development
Every implemented feature MUST be demonstrable in the 7-minute pre-recorded demo.
If a feature cannot be clearly shown, it MUST be removed from scope. Work priority
MUST favor visible wow-factor outcomes: animated map behavior, real-time updates,
and AI-generated insights. Seed data MUST tell compelling and realistic legal risk
scenarios suitable for GC/CLO/Legal Ops audiences.

Rationale: The competition outcome depends on narrative clarity and visual impact,
not on breadth of unseen backend functionality.

### VII. Security and Accessibility Baseline
Real credentials, tokens, and API keys MUST NOT be committed in code or config.
Interactive controls MUST include basic ARIA labels. Critical user flows MUST support
keyboard navigation. Visual encodings MUST be color-blind friendly and MUST NOT rely
on red/green color alone to convey state.

Rationale: Even hackathon demos must demonstrate responsible engineering practices
for enterprise legal stakeholders.

### VIII. Scope Governance and Delivery Focus
Mock data MUST be preferred over real external integrations. Authentication/login
screens are out of scope. Database migrations and ORM setup are out of scope. CI/CD
pipeline setup is out of scope for this event. The mandatory product focus is map
visualization, AI risk intelligence, and dashboard storytelling.

Rationale: Scope discipline is required to finish a high-quality end-to-end demo
within 2.5 days.

## Technical and Delivery Constraints

- Project context: WK Code Games 2026 hackathon, 6 team members, 2.5 days.
- Presentation format: 7-minute pre-recorded demo plus 5-minute Q&A.
- AI engine requirement: FAB Agent is mandatory for analysis, summarization, and
	recommendation experiences.
- Target audience: General Counsel, Chief Legal Officer, and Legal Operations
	Directors.

## Workflow and Quality Gates

- Every spec and plan MUST include explicit constitution alignment checks.
- A feature is "ready" only when it is visible in demo flow, tested at required
	level, and within performance budgets.
- Pull requests MUST list which principle(s) are satisfied and include evidence
	(test output, timing evidence, or screenshots where relevant).
- Any out-of-scope work requires explicit written approval by team leads and MUST
	not displace P1 demo-critical tasks.

## Governance

This constitution is the highest-priority delivery policy for RiskRadar.

- Amendment process: Any change requires a documented proposal, team review, and a
	synchronization update to affected templates in `.specify/templates/`.
- Versioning policy: Semantic versioning is mandatory for this constitution.
	- MAJOR: Removing or redefining a principle in a backward-incompatible way.
	- MINOR: Adding a new principle or materially expanding guidance.
	- PATCH: Clarifications, wording improvements, and typo fixes.
- Compliance review: Constitution compliance MUST be checked at spec creation,
	plan creation, task generation, and pull request review.
- Enforcement: Non-compliant work MUST be corrected before merge unless an explicit,
	documented exception is approved by team leads.

**Version**: 1.0.0 | **Ratified**: 2026-04-20 | **Last Amended**: 2026-04-20
