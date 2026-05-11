/**
 * portfolio.routes.ts — aggregate dashboard endpoints.
 *
 * Reads from the live Passport SQL Server when RISKRADAR_DATA_SOURCE=passport,
 * otherwise computes everything from the local JSON seed data. Even when the
 * Passport mode is enabled, a per-call failure transparently falls back to
 * JSON so the dashboard never goes blank.
 */
import { Router, type Request, type Response } from "express";
import { coordsForState } from "../data/usStateCoords";
import { loadMatters, loadJurisdictions, passportMode } from "../data/loaders";
import * as passport from "../data/passportRepo";

export interface PortfolioStats {
  critical: number;
  warning: number;
  healthy: number;
  totalActive: number;
  avgRiskScore: number;
  topRisk: string;
}

export interface PortfolioStateRow {
  jurisdictionId: string;
  code: string;
  name: string;
  critical: number;
  warning: number;
  healthy: number;
  total: number;
}

export const portfolioRouter = Router();

/** Compute KPI tile counts from JSON seed matters. Thresholds mirror the UI (75 / 50). */
async function computeStatsFromJson(): Promise<PortfolioStats> {
  const matters = (await loadMatters()).filter((m) => m.status !== "closed");
  let critical = 0, warning = 0, healthy = 0, scoreSum = 0;
  for (const m of matters) {
    if (m.riskScore >= 75) critical++;
    else if (m.riskScore >= 50) warning++;
    else healthy++;
    scoreSum += m.riskScore;
  }
  const totalActive = matters.length;
  const avgRiskScore = totalActive > 0 ? Math.round((scoreSum / totalActive) * 10) / 10 : 0;
  return { critical, warning, healthy, totalActive, avgRiskScore, topRisk: "Budget Burn" };
}

/** Aggregate matters by jurisdiction (state) for the map bubbles. Matches
 *  the Passport `fetchPortfolioByState` row shape. */
async function computeByStateFromJson(): Promise<PortfolioStateRow[]> {
  const [matters, jurisdictions] = await Promise.all([loadMatters(), loadJurisdictions()]);
  const jByCode = new Map(jurisdictions.map((j) => [j.code, j]));
  const buckets = new Map<string, PortfolioStateRow>();
  for (const m of matters) {
    if (m.status === "closed") continue;
    const code = m.jurisdictionCode ?? m.jurisdictionId;
    const j = jByCode.get(code);
    const stateCode = code.startsWith("US-") ? code.slice(3) : code;
    const row = buckets.get(stateCode) ?? {
      jurisdictionId: m.jurisdictionId,
      code: stateCode,
      name: j?.name ?? m.jurisdictionName ?? stateCode,
      critical: 0, warning: 0, healthy: 0, total: 0
    };
    if (m.riskScore >= 75) row.critical++;
    else if (m.riskScore >= 50) row.warning++;
    else row.healthy++;
    row.total++;
    buckets.set(stateCode, row);
  }
  return Array.from(buckets.values());
}

/** GET /api/portfolio/stats
 *  Returns the four KPI numbers shown on the dashboard tiles. Sourced
 *  entirely from the local JSON seed data. */
portfolioRouter.get("/stats", async (_req: Request, res: Response) => {
  try {
    if (passportMode()) {
      try {
        const stats = await passport.fetchPortfolioStats();
        return res.json({ data: stats });
      } catch (err) {
        console.warn("[portfolio] passport stats failed, falling back to JSON:", err instanceof Error ? err.message : err);
      }
    }
    res.json({ data: await computeStatsFromJson() });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[portfolio] stats failed: ${msg}`);
    res.json({
      data: { critical: 0, warning: 0, healthy: 0, totalActive: 0, avgRiskScore: 0, topRisk: "Budget Burn" }
    });
  }
});

/** GET /api/portfolio/by-state
 *  Returns one bubble per US state with critical/warning/healthy counts.
 *  Each row is enriched with a centroid lat/lng so the frontend can render
 *  the map without keeping its own coordinate database. */
portfolioRouter.get("/by-state", async (_req: Request, res: Response) => {
  let rows: PortfolioStateRow[] = [];
  if (passportMode()) {
    try {
      rows = await passport.fetchPortfolioByState();
    } catch (err) {
      console.warn("[portfolio] passport by-state failed, falling back to JSON:", err instanceof Error ? err.message : err);
    }
  }
  if (rows.length === 0) {
    try {
      rows = await computeByStateFromJson();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[portfolio] JSON by-state failed: ${msg}`);
    }
  }
  const enriched = rows
    .map((r) => {
      const coords = coordsForState(r.code);
      return coords ? { ...r, lat: coords.lat, lng: coords.lng } : null;
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);
  res.json({ data: enriched });
});
