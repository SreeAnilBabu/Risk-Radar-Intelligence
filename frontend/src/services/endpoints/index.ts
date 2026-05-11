import { apiRequest, apiRequestWithMeta } from "../apiClient";
import type {
  AIBriefing,
  AIQueryResponse,
  AlertAction,
  AlertCounters,
  AlertStatus,
  Jurisdiction,
  JurisdictionRiskProfile,
  MatterActivityEvent,
  MatterBudgetHistory,
  MatterRiskRecord,
  RiskAlert,
  RiskTrendPoint,
  SimulationResult,
  VendorRiskSummary
} from "../../types/domain";

export function listRisks() {
  return apiRequestWithMeta<JurisdictionRiskProfile[], { refreshedAt: string }>("/api/risks");
}

export function getRisk(jurisdictionId: string) {
  return apiRequest<JurisdictionRiskProfile>(`/api/risks/${jurisdictionId}`);
}

export function listRiskTrends(jurisdictionId?: string) {
  const query = jurisdictionId ? `?jurisdictionId=${jurisdictionId}` : "";
  return apiRequest<RiskTrendPoint[]>(`/api/risks/trends${query}`);
}

export interface MattersListMeta extends Record<string, unknown> {
  total: number;
  page: number;
  size: number;
  source: "passport" | "json";
}

export function listMatters(opts?: { jurisdictionId?: string; level?: "critical" | "warning" | "healthy" | "all"; page?: number; size?: number }) {
  const params = new URLSearchParams();
  if (opts?.jurisdictionId) params.set("jurisdictionId", opts.jurisdictionId);
  if (opts?.level) params.set("level", opts.level);
  if (opts?.page !== undefined) params.set("page", String(opts.page));
  if (opts?.size !== undefined) params.set("size", String(opts.size));
  const query = params.toString();
  return apiRequest<MatterRiskRecord[]>(`/api/matters${query ? `?${query}` : ""}`);
}

/** Same call as `listMatters` but returns the full envelope (data + total
 *  + source) so the matters-list page can display "Showing X of N from
 *  Passport DB" accurately. */
export function listMattersWithMeta(opts?: { jurisdictionId?: string; level?: "critical" | "warning" | "healthy" | "all"; page?: number; size?: number }) {
  const params = new URLSearchParams();
  if (opts?.jurisdictionId) params.set("jurisdictionId", opts.jurisdictionId);
  if (opts?.level) params.set("level", opts.level);
  if (opts?.page !== undefined) params.set("page", String(opts.page));
  if (opts?.size !== undefined) params.set("size", String(opts.size));
  const query = params.toString();
  return apiRequestWithMeta<MatterRiskRecord[], MattersListMeta>(
    `/api/matters${query ? `?${query}` : ""}`
  );
}

/** Aggregate KPI counts for the Briefing/Dashboard tiles. Server-side
 *  rollup; never pulls raw matters. */
export interface PortfolioStats {
  critical: number;
  warning: number;
  healthy: number;
  totalActive: number;
  avgRiskScore: number;
  topRisk: string;
}

export function getPortfolioStats() {
  return apiRequest<PortfolioStats>("/api/portfolio/stats");
}

/** One bubble per US state for the dashboard map. Server-side aggregate +
 *  centroid lat/lng so we never plot 245k matters individually. */
export interface PortfolioStateBubble {
  jurisdictionId: string;
  code: string;
  name: string;
  critical: number;
  warning: number;
  healthy: number;
  total: number;
  lat: number;
  lng: number;
}

export function getPortfolioByState() {
  return apiRequest<PortfolioStateBubble[]>("/api/portfolio/by-state");
}

export function getMatter(matterId: string) {
  return apiRequest<MatterRiskRecord>(`/api/matters/${matterId}`);
}

/** Curated budget revision history for a matter (FR-026). When the
 *  matter has no curated entry the API returns `null` data with
 *  `hasHistory: false` so the UI can show the empty state. */
export function getMatterBudgetHistory(matterId: string) {
  return apiRequestWithMeta<MatterBudgetHistory | null, { hasHistory: boolean }>(
    `/api/matters/${encodeURIComponent(matterId)}/budget-history`
  );
}

/** Reverse-chronological activity timeline (FR-028 / CL-009). */
export function getMatterTimeline(matterId: string) {
  return apiRequest<MatterActivityEvent[]>(
    `/api/matters/${encodeURIComponent(matterId)}/timeline`
  );
}

export function listJurisdictions() {
  return apiRequest<Jurisdiction[]>("/api/jurisdictions");
}

export function listAlerts(status?: AlertStatus) {
  const query = status ? `?status=${status}` : "";
  return apiRequestWithMeta<RiskAlert[], { counters: AlertCounters }>(`/api/alerts${query}`);
}

export function patchAlert(id: string, action: AlertAction) {
  return apiRequestWithMeta<RiskAlert, { counters: AlertCounters }>(`/api/alerts/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ action })
  });
}

export function listVendors() {
  return apiRequest<VendorRiskSummary[]>("/api/vendors");
}

export function postBriefing(focus: "daily" | "jurisdiction" | "board" = "daily", jurisdictionIds?: string[]) {
  return apiRequest<AIBriefing>("/api/ai/briefing", {
    method: "POST",
    body: JSON.stringify({ focus, jurisdictionIds })
  });
}

export function postQuery(question: string) {
  return apiRequest<AIQueryResponse>("/api/ai/query", {
    method: "POST",
    body: JSON.stringify({ question })
  });
}

export function postSimulation(prompt: string, baselineJurisdictionIds?: string[]) {
  return apiRequest<SimulationResult>("/api/ai/simulate", {
    method: "POST",
    body: JSON.stringify({ prompt, baselineJurisdictionIds })
  });
}
