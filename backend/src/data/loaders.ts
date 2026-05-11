import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  alertCountersSchema,
  jurisdictionRiskProfileSchema,
  matterBudgetHistorySchema,
  matterRiskRecordSchema,
  rawJurisdictionSchema,
  riskAlertSchema,
  riskTrendPointSchema,
  vendorRiskSummarySchema,
  type JurisdictionRiskProfile,
  type MatterBudgetHistory,
  type MatterRiskRecord,
  type RawJurisdiction,
  type RiskAlert,
  type RiskTrendPoint,
  type VendorRiskSummary
} from "../types/domain";
import { calculateRiskScore, getRiskLevel } from "../services/riskScore.service";
import { getRefreshTimestamp } from "../services/refreshTicker";
import * as passport from "./passportRepo";

/** True when RISKRADAR_DATA_SOURCE=passport. When set, every loader tries
 *  the live Passport DB first and silently falls back to the JSON seed if
 *  the query fails (so a misconfigured DB doesn't kill the demo). */
export function passportMode(): boolean {
  return (process.env.RISKRADAR_DATA_SOURCE ?? "").toLowerCase() === "passport";
}

/** Run a Passport-backed loader; on any error, log once and resolve to the
 *  JSON-backed fallback so the API stays up. */
async function tryPassport<T>(label: string, run: () => Promise<T>, fallback: () => Promise<T>): Promise<T> {
  if (!passportMode()) return fallback();
  try {
    return await run();
  } catch (err) {
    console.warn(`[passport] ${label} failed, falling back to JSON:`, err instanceof Error ? err.message : err);
    return fallback();
  }
}

type CacheRecord = RawJurisdiction[] | MatterRiskRecord[] | RiskAlert[] | RiskTrendPoint[] | VendorRiskSummary[];

const fileCache = new Map<string, CacheRecord>();

async function loadJsonFile<T>(fileName: string): Promise<T> {
  const existing = fileCache.get(fileName);
  if (existing) {
    return existing as T;
  }

  const fullPath = path.resolve(process.cwd(), "src", "data", fileName);
  const fileContents = await readFile(fullPath, "utf-8");
  const parsed = JSON.parse(fileContents) as T;
  fileCache.set(fileName, parsed as CacheRecord);
  return parsed;
}

export async function loadJurisdictions(): Promise<JurisdictionRiskProfile[]> {
  const refreshedAt = getRefreshTimestamp();
  return tryPassport(
    "loadJurisdictions",
    () => passport.fetchJurisdictions(refreshedAt),
    async () => {
      const raw = await loadJsonFile<RawJurisdiction[]>("jurisdictions.json");
      return raw.map((item) => {
        const jurisdiction = rawJurisdictionSchema.parse(item);
        const score = calculateRiskScore(jurisdiction.riskFactors);
        return jurisdictionRiskProfileSchema.parse({
          id: jurisdiction.id,
          name: jurisdiction.name,
          code: jurisdiction.code,
          overallRiskScore: score,
          riskLevel: getRiskLevel(score),
          trendDirection: jurisdiction.trendDirection,
          topRiskFactors: jurisdiction.riskFactors,
          matterCount: jurisdiction.matterCount,
          totalSpend: jurisdiction.totalSpend,
          openAlerts: jurisdiction.openAlerts,
          geometryRef: jurisdiction.geometryRef,
          lastUpdatedAt: refreshedAt
        });
      });
    }
  );
}

export async function loadMatters(): Promise<MatterRiskRecord[]> {
  return tryPassport(
    "loadMatters",
    () => passport.fetchMatters(),
    async () => {
      const raw = await loadJsonFile<MatterRiskRecord[]>("matters.json");
      return raw.map((item) => matterRiskRecordSchema.parse(item));
    }
  );
}

export async function loadMatterById(id: string): Promise<MatterRiskRecord | null> {
  return tryPassport(
    "loadMatterById",
    () => passport.fetchMatterById(id),
    async () => {
      const all = await loadJsonFile<MatterRiskRecord[]>("matters.json");
      const found = all.find((m) => m.id === id) ?? null;
      return found ? matterRiskRecordSchema.parse(found) : null;
    }
  );
}

export async function loadVendors(): Promise<VendorRiskSummary[]> {
  return tryPassport(
    "loadVendors",
    () => passport.fetchVendors(),
    async () => {
      const raw = await loadJsonFile<VendorRiskSummary[]>("vendors.json");
      return raw.map((item) => vendorRiskSummarySchema.parse(item));
    }
  );
}

export async function loadTrends(): Promise<RiskTrendPoint[]> {
  return tryPassport(
    "loadTrends",
    () => passport.fetchTrends(),
    async () => {
      const raw = await loadJsonFile<RiskTrendPoint[]>("trends.json");
      return raw.map((item) => riskTrendPointSchema.parse(item));
    }
  );
}

let alertsStorePromise: Promise<RiskAlert[]> | undefined;

export async function loadAlerts(): Promise<RiskAlert[]> {
  if (!alertsStorePromise) {
    alertsStorePromise = tryPassport(
      "loadAlerts",
      () => passport.fetchAlerts(),
      async () => {
        const items = await loadJsonFile<RiskAlert[]>("alerts.json");
        return items.map((item) => riskAlertSchema.parse(item));
      }
    );
  }
  return alertsStorePromise;
}

export async function replaceAlerts(nextAlerts: RiskAlert[]): Promise<void> {
  alertCountersSchema.parse({
    unread: nextAlerts.filter((alert) => alert.status === "unread").length,
    snoozed: nextAlerts.filter((alert) => alert.status === "snoozed").length,
    escalated: nextAlerts.filter((alert) => alert.status === "escalated").length,
    total: nextAlerts.length
  });
  alertsStorePromise = Promise.resolve(nextAlerts);
}

/** Load curated budget revision histories. Only the demo-narrative matters
 *  have entries (CL-007); for any other matter id this returns null and the
 *  UI renders a "no revisions yet" empty state. */
export async function loadBudgetHistory(matterId: string): Promise<MatterBudgetHistory | null> {
  const all = await loadJsonFile<unknown[]>("budgetHistory.json");
  const parsed = all.map((item) => matterBudgetHistorySchema.parse(item));
  return parsed.find((entry) => entry.matterId === matterId) ?? null;
}
