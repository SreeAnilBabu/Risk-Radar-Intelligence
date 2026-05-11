/**
 * passportRepo.ts — SQL queries that map Passport tables → RiskRadar domain.
 *
 * ─── HOW THIS WORKS ──────────────────────────────────────────────────────
 * Each `fetchXxx` function runs a query against Passport SQL Server, then
 * transforms each row into the canonical domain type the rest of RiskRadar
 * consumes. The domain types are validated upstream in loaders.ts via zod,
 * so this file's job is purely shape mapping.
 *
 * ─── PLACEHOLDER COLUMNS ─────────────────────────────────────────────────
 * Column names below are educated guesses based on a typical Passport
 * deployment. Confirm them against your schema with:
 *
 *   SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS
 *   WHERE TABLE_NAME = 'P_MATTER' ORDER BY ORDINAL_POSITION;
 *
 * Then update the SELECT lists and the row-mapper functions below.
 * Anything tagged `-- TODO:` needs your confirmation.
 */
import { query } from "./passportDb";
import type {
  JurisdictionRiskProfile,
  MatterRiskRecord,
  RiskAlert,
  RiskTrendPoint,
  VendorRiskSummary
} from "../types/domain";
import { calculateRiskScore, getRiskLevel } from "../services/riskScore.service";

/* ────────────────────────────────────────────────────────────────────────
 * MATTERS
 * ──────────────────────────────────────────────────────────────────────── */

interface PassportMatterRow {
  MATTER_ID: string;
  MATTER_NAME: string;
  MATTER_NUMBER: string | null;
  PRACTICE_AREA: string | null;
  JURISDICTION_ID: string | null;
  JURISDICTION_CODE: string | null;
  JURISDICTION_NAME: string | null;
  STATUS_ID: number | null;
  CLOSE_DATE: Date | null;
  SPEND_TO_DATE: number | null;
  BUDGET_AMOUNT: number | null;
  VENDOR_ID: string | null;
  VENDOR_NAME: string | null;
  SUMMARY: string | null;
  UPDATED_AT: Date;
}

const MATTERS_SQL = `
  -- Matters joined to:
  --   * Practice area via P_PRACTIC_AREA_BUSINESS_UNIT (note: typo in schema)
  --   * Jurisdiction via P_MATTER.state_id -> P_JURISDICTION.id
  --   * Total approved budget via P_MATTER_BUDGET (sum of amount_amount,
  --     ignoring archived budget rows)
  --   * Lead vendor via P_MATTER_BUDGET.matter_organization_id (best signal
  --     we have today; replaced once a dedicated matter-vendor link table
  --     is confirmed).
  -- Spend comes straight from P_MATTER.spend_to_date_amount which Passport
  -- already keeps in sync with approved invoice actuals.
  SELECT
    CAST(m.id AS NVARCHAR(64))                  AS MATTER_ID,
    m.name                                      AS MATTER_NAME,
    m.matter_number                             AS MATTER_NUMBER,
    pa.name                                     AS PRACTICE_AREA,
    CAST(m.state_id AS NVARCHAR(64))            AS JURISDICTION_ID,
    sp.state_code                               AS JURISDICTION_CODE,
    sp.state                                    AS JURISDICTION_NAME,
    m.matter_status_id                          AS STATUS_ID,
    m.close_date                                AS CLOSE_DATE,
    m.spend_to_date_amount                      AS SPEND_TO_DATE,
    bud.BUDGET_AMOUNT                           AS BUDGET_AMOUNT,
    CAST(bud.MATTER_ORGANIZATION_ID AS NVARCHAR(64)) AS VENDOR_ID,
    org.name                                    AS VENDOR_NAME,
    m.description                               AS SUMMARY,
    m.updated_at                                AS UPDATED_AT
  FROM P_MATTER m
  LEFT JOIN P_PRACTIC_AREA_BUSINESS_UNIT pabu ON pabu.id = m.practic_area_busin_unit_id
  LEFT JOIN P_PRACTICE_AREA pa                 ON pa.id  = pabu.practice_area_id
  LEFT JOIN P_STATE_PROVINCE sp                ON sp.id  = m.state_id
  LEFT JOIN (
    SELECT
      mb.matter_id,
      SUM(COALESCE(mb.amount_amount, 0))      AS BUDGET_AMOUNT,
      MAX(mb.matter_organization_id)          AS MATTER_ORGANIZATION_ID
    FROM P_MATTER_BUDGET mb
    WHERE COALESCE(mb.archiv_behavior_is_archived, 0) = 0
    GROUP BY mb.matter_id
  ) bud ON bud.matter_id = m.id
  LEFT JOIN P_MATTER_ORGANIZATION mo           ON mo.id  = bud.MATTER_ORGANIZATION_ID
  LEFT JOIN P_ORGANIZATION org                 ON org.id = mo.organization_id
  WHERE COALESCE(m.archiv_behavior_is_archived, 0) = 0
    AND m.close_date IS NULL
`;

function mapMatterRow(row: PassportMatterRow): MatterRiskRecord {
  // Real budget vs spend now drive the score: anything tracking >25% over
  // budget is at_risk; the riskScore curve is centred so a healthy matter
  // sits around 30-40, a 25% overrun lands ~75 (critical territory).
  const budget = row.BUDGET_AMOUNT ?? 0;
  // Passport allows credit memos / reversals which can push spend negative.
  // The domain schema requires spendToDate >= 0, so floor at zero.
  const spend = Math.max(0, row.SPEND_TO_DATE ?? 0);
  const overrunPct = budget > 0 ? ((spend - budget) / budget) * 100 : 0;
  const riskScore = Math.min(100, Math.max(0, Math.round(50 + overrunPct)));
  const status: MatterRiskRecord["status"] = row.CLOSE_DATE
    ? "closed"
    : overrunPct >= 10 ? "at_risk" : "open";

  return {
    id: row.MATTER_ID,
    matterNumber: row.MATTER_NUMBER,
    jurisdictionId: row.JURISDICTION_ID ?? "unknown",
    jurisdictionCode: row.JURISDICTION_CODE,
    jurisdictionName: row.JURISDICTION_NAME,
    title: row.MATTER_NAME ?? row.MATTER_NUMBER ?? row.MATTER_ID,
    practiceArea: row.PRACTICE_AREA ?? "Unspecified",
    status,
    riskScore,
    spendToDate: spend,
    budgetTotal: budget,
    outsideCounselVendorId: row.VENDOR_ID ?? "unknown",
    vendorName: row.VENDOR_NAME,
    summary: row.SUMMARY ?? "",
    // Some Passport rows have a NULL updated_at; fall back to close_date or
    // "now" so the API never throws on a missing audit timestamp.
    updatedAt: (row.UPDATED_AT ?? row.CLOSE_DATE ?? new Date()).toISOString()
  };
}

export async function fetchMatters(): Promise<MatterRiskRecord[]> {
  const result = await query<PassportMatterRow>(MATTERS_SQL);
  return result.recordset.map(mapMatterRow);
}

export async function fetchMatterById(id: string): Promise<MatterRiskRecord | null> {
  const result = await query<PassportMatterRow>(`${MATTERS_SQL} AND CAST(m.id AS NVARCHAR(64)) = @id`, { id });
  const row = result.recordset[0];
  return row ? mapMatterRow(row) : null;
}

/* ────────────────────────────────────────────────────────────────────────
 * PORTFOLIO STATS — cheap server-side aggregate so the dashboard never has
 * to pull every matter just to count three buckets. Buckets follow the
 * same "% over budget" logic as `mapMatterRow`:
 *   critical : overrun_pct >= 25  (riskScore >= 75)
 *   warning  : 0 <= overrun_pct < 25 (riskScore 50–74)
 *   healthy  : overrun_pct < 0     (riskScore < 50)
 * Closed matters are excluded entirely.
 * ──────────────────────────────────────────────────────────────────────── */

export interface PortfolioStats {
  critical: number;
  warning: number;
  healthy: number;
  totalActive: number;
  avgRiskScore: number;
  /** "Top risk" label — the bucket with the highest critical-share */
  topRisk: string;
}

const PORTFOLIO_STATS_SQL = `
  WITH matter_burn AS (
    SELECT
      m.id,
      CASE
        WHEN COALESCE(b.budget, 0) > 0
          THEN ((COALESCE(m.spend_to_date_amount, 0) - b.budget) / b.budget) * 100.0
        ELSE 0.0
      END AS overrun_pct
    FROM P_MATTER m
    LEFT JOIN (
      SELECT matter_id, SUM(COALESCE(amount_amount, 0)) AS budget
      FROM P_MATTER_BUDGET
      WHERE COALESCE(archiv_behavior_is_archived, 0) = 0
      GROUP BY matter_id
    ) b ON b.matter_id = m.id
    WHERE COALESCE(m.archiv_behavior_is_archived, 0) = 0
      AND m.close_date IS NULL
  )
  SELECT
    SUM(CASE WHEN overrun_pct >= 25 THEN 1 ELSE 0 END)               AS CRITICAL,
    SUM(CASE WHEN overrun_pct >= 0 AND overrun_pct < 25 THEN 1 ELSE 0 END) AS WARNING,
    SUM(CASE WHEN overrun_pct < 0 THEN 1 ELSE 0 END)                 AS HEALTHY,
    COUNT(*)                                                          AS TOTAL_ACTIVE,
    AVG(CAST(50 + overrun_pct AS FLOAT))                              AS AVG_RISK
  FROM matter_burn
`;

export async function fetchPortfolioStats(): Promise<PortfolioStats> {
  const result = await query<{
    CRITICAL: number; WARNING: number; HEALTHY: number;
    TOTAL_ACTIVE: number; AVG_RISK: number | null;
  }>(PORTFOLIO_STATS_SQL);
  const r = result.recordset[0] ?? { CRITICAL: 0, WARNING: 0, HEALTHY: 0, TOTAL_ACTIVE: 0, AVG_RISK: 0 };
  return {
    critical: r.CRITICAL ?? 0,
    warning: r.WARNING ?? 0,
    healthy: r.HEALTHY ?? 0,
    totalActive: r.TOTAL_ACTIVE ?? 0,
    avgRiskScore: Math.min(100, Math.max(0, Math.round(r.AVG_RISK ?? 0))),
    topRisk: "Budget Burn"
  };
}

/* ────────────────────────────────────────────────────────────────────────
 * PORTFOLIO BY STATE — one row per US state with critical/warning counts
 * for the dashboard map. Returns ~50 rows max, regardless of how many
 * matters live in each state.
 * ──────────────────────────────────────────────────────────────────────── */

export interface PortfolioStateRow {
  jurisdictionId: string;
  code: string;
  name: string;
  critical: number;
  warning: number;
  healthy: number;
  total: number;
}

const PORTFOLIO_BY_STATE_SQL = `
  -- P_STATE_PROVINCE doubles as the country lookup AND the US-state lookup.
  -- Real US states are the rows where state_code is populated (e.g. 'CA',
  -- 'NY'); other rows reference whole countries (US = country-level row at
  -- id=284). We join via P_MATTER.state_id and filter to state_code IS NOT
  -- NULL so the dashboard only shows state-level pins, not country pins.
  WITH matter_burn AS (
    SELECT
      m.id,
      m.state_id,
      CASE
        WHEN COALESCE(b.budget, 0) > 0
          THEN ((COALESCE(m.spend_to_date_amount, 0) - b.budget) / b.budget) * 100.0
        ELSE 0.0
      END AS overrun_pct
    FROM P_MATTER m
    LEFT JOIN (
      SELECT matter_id, SUM(COALESCE(amount_amount, 0)) AS budget
      FROM P_MATTER_BUDGET
      WHERE COALESCE(archiv_behavior_is_archived, 0) = 0
      GROUP BY matter_id
    ) b ON b.matter_id = m.id
    WHERE COALESCE(m.archiv_behavior_is_archived, 0) = 0
      AND m.close_date IS NULL
      AND m.state_id IS NOT NULL
  )
  SELECT
    CAST(sp.id AS NVARCHAR(64))  AS JURISDICTION_ID,
    sp.state_code                AS CODE,
    sp.state                     AS NAME,
    SUM(CASE WHEN mb.overrun_pct >= 25 THEN 1 ELSE 0 END)               AS CRITICAL,
    SUM(CASE WHEN mb.overrun_pct >= 0 AND mb.overrun_pct < 25 THEN 1 ELSE 0 END) AS WARNING,
    SUM(CASE WHEN mb.overrun_pct < 0 THEN 1 ELSE 0 END)                 AS HEALTHY,
    COUNT(mb.id)                                                         AS TOTAL
  FROM P_STATE_PROVINCE sp
  INNER JOIN matter_burn mb ON mb.state_id = sp.id
  WHERE sp.state_code IS NOT NULL
  GROUP BY sp.id, sp.state_code, sp.state
  HAVING COUNT(mb.id) > 0
`;

export async function fetchPortfolioByState(): Promise<PortfolioStateRow[]> {
  const result = await query<{
    JURISDICTION_ID: string; CODE: string; NAME: string;
    CRITICAL: number; WARNING: number; HEALTHY: number; TOTAL: number;
  }>(PORTFOLIO_BY_STATE_SQL);
  return result.recordset.map((r) => ({
    jurisdictionId: r.JURISDICTION_ID,
    code: r.CODE ?? "",
    name: r.NAME ?? "",
    critical: r.CRITICAL ?? 0,
    warning: r.WARNING ?? 0,
    healthy: r.HEALTHY ?? 0,
    total: r.TOTAL ?? 0
  }));
}

/* ────────────────────────────────────────────────────────────────────────
 * AT-RISK MATTERS — filtered + paginated. Pushes the level filter down to
 * SQL so the API never returns the full 245k portfolio.
 * ──────────────────────────────────────────────────────────────────────── */

export interface MatterListFilter {
  level?: "critical" | "warning" | "healthy" | "all";
  jurisdictionId?: string;
  page?: number;
  size?: number;
}

export async function fetchMattersFiltered(filter: MatterListFilter): Promise<MatterRiskRecord[]> {
  const level = filter.level ?? "at-risk"; // default = critical+warning only
  const page = Math.max(0, filter.page ?? 0);
  const size = Math.min(500, Math.max(1, filter.size ?? 100));

  // Burn-pct expression — MUST stay byte-identical to PORTFOLIO_STATS_SQL
  // so the dashboard tile counts and the list-page totals always reconcile.
  // Matters with NULL/zero budget are treated as 0% overrun (warning bucket).
  const overrunExpr = `(CASE WHEN COALESCE(bud.BUDGET_AMOUNT, 0) > 0
    THEN ((COALESCE(m.spend_to_date_amount, 0) - bud.BUDGET_AMOUNT) / bud.BUDGET_AMOUNT) * 100.0
    ELSE 0.0 END)`;
  let burnFilter = "";
  if (level === "critical") burnFilter = `AND ${overrunExpr} >= 25`;
  else if (level === "warning") burnFilter = `AND ${overrunExpr} >= 0 AND ${overrunExpr} < 25`;
  else if (level === "healthy") burnFilter = `AND ${overrunExpr} < 0`;
  else if (level !== "all") burnFilter = `AND ${overrunExpr} >= 0`; // at-risk = critical + warning

  const stateFilter = filter.jurisdictionId ? "AND CAST(m.state_id AS NVARCHAR(64)) = @stateId" : "";

  const sql = `${MATTERS_SQL}
    ${burnFilter}
    ${stateFilter}
    ORDER BY ${overrunExpr} DESC, m.id
    OFFSET @offset ROWS FETCH NEXT @size ROWS ONLY`;

  const params: Record<string, string | number> = { offset: page * size, size };
  if (filter.jurisdictionId) params.stateId = filter.jurisdictionId;

  const result = await query<PassportMatterRow>(sql, params);
  return result.recordset.map(mapMatterRow);
}

/**
 * Cheap COUNT(*) for the same filter — lets the UI display "Showing X of N"
 * without paging through the entire result set. Mirrors the WHERE clause
 * of fetchMattersFiltered exactly so the totals always reconcile.
 */
export async function fetchMattersCount(filter: MatterListFilter): Promise<number> {
  const level = filter.level ?? "at-risk";
  const overrunExpr = `(CASE WHEN COALESCE(bud.BUDGET_AMOUNT, 0) > 0
    THEN ((COALESCE(m.spend_to_date_amount, 0) - bud.BUDGET_AMOUNT) / bud.BUDGET_AMOUNT) * 100.0
    ELSE 0.0 END)`;
  let burnFilter = "";
  if (level === "critical") burnFilter = `AND ${overrunExpr} >= 25`;
  else if (level === "warning") burnFilter = `AND ${overrunExpr} >= 0 AND ${overrunExpr} < 25`;
  else if (level === "healthy") burnFilter = `AND ${overrunExpr} < 0`;
  else if (level !== "all") burnFilter = `AND ${overrunExpr} >= 0`;
  const stateFilter = filter.jurisdictionId ? "AND CAST(m.state_id AS NVARCHAR(64)) = @stateId" : "";

  // Reuse MATTERS_SQL as the body but wrap as a sub-select so we can COUNT.
  const sql = `SELECT COUNT(*) AS TOTAL FROM (${MATTERS_SQL} ${burnFilter} ${stateFilter}) src`;
  const params: Record<string, string | number> = {};
  if (filter.jurisdictionId) params.stateId = filter.jurisdictionId;

  const result = await query<{ TOTAL: number }>(sql, params);
  return result.recordset[0]?.TOTAL ?? 0;
}

/* ────────────────────────────────────────────────────────────────────────
 * VENDORS (firms / outside counsel)
 * ──────────────────────────────────────────────────────────────────────── */

interface PassportVendorRow {
  VENDOR_ID: string;
  VENDOR_NAME: string;
  ACTIVE_MATTERS: number;
  TOTAL_SPEND: number;
  ANOMALY_COUNT: number;
  JURISDICTION_IDS: string | null; // comma-separated
}

const VENDORS_SQL = `
  -- Outside counsel & service providers live in P_ORGANIZATION. Active matter
  -- counts come from P_MATTER_BUDGET (matter_organization_id), spend from
  -- approved P_INVOICE_HEADER + P_INVOICE_SUMMARY rows, and the anomaly
  -- count from invoices flagged with errors or rejected.
  -- TODO: filter to outside-counsel orgs only via P_ORGANIZATION_TYPE / SUB_TYPE.
  SELECT
    CAST(o.id AS NVARCHAR(64))                               AS VENDOR_ID,
    o.name                                                   AS VENDOR_NAME,
    COUNT(DISTINCT mb.matter_id)                             AS ACTIVE_MATTERS,
    COALESCE(spend.TOTAL_SPEND, 0)                           AS TOTAL_SPEND,
    COALESCE(spend.ANOMALY_COUNT, 0)                         AS ANOMALY_COUNT,
    NULL                                                     AS JURISDICTION_IDS
  FROM P_ORGANIZATION o
  LEFT JOIN P_MATTER_BUDGET mb ON mb.matter_organization_id = o.id
                              AND COALESCE(mb.archiv_behavior_is_archived, 0) = 0
  LEFT JOIN (
    -- Spend + anomaly aggregation per organization
    SELECT
      mo.organization_id,
      SUM(COALESCE(s.total_net_amount_amount, 0)) AS TOTAL_SPEND,
      SUM(CASE WHEN h.has_errors = 1 OR h.is_voided = 1 THEN 1 ELSE 0 END) AS ANOMALY_COUNT
    FROM P_INVOICE_HEADER h
    INNER JOIN P_INVOICE_SUMMARY s ON s.invoice_header_id = h.id
    INNER JOIN P_MATTER_ORGANIZATION mo
      ON mo.id = h.matter_org_id
     AND COALESCE(mo.archiv_behavior_is_archived, 0) = 0
     AND COALESCE(mo.is_active, 1) = 1
    WHERE COALESCE(h.archiv_behavior_is_archived, 0) = 0
    GROUP BY mo.organization_id
  ) spend ON spend.organization_id = o.id
  GROUP BY o.id, o.name, spend.TOTAL_SPEND, spend.ANOMALY_COUNT
  HAVING COUNT(DISTINCT mb.matter_id) > 0
`;

function mapVendorRow(row: PassportVendorRow): VendorRiskSummary {
  const performanceRiskScore = Math.min(100, row.ANOMALY_COUNT * 8 + (row.ACTIVE_MATTERS > 5 ? 20 : 0));
  return {
    id: row.VENDOR_ID,
    name: row.VENDOR_NAME,
    activeMatterCount: row.ACTIVE_MATTERS,
    totalSpend: row.TOTAL_SPEND,
    performanceRiskScore,
    billingAnomalyCount: row.ANOMALY_COUNT,
    jurisdictionIds: row.JURISDICTION_IDS ? row.JURISDICTION_IDS.split(",").filter(Boolean) : []
  };
}

export async function fetchVendors(): Promise<VendorRiskSummary[]> {
  const result = await query<PassportVendorRow>(VENDORS_SQL);
  return result.recordset.map(mapVendorRow);
}

/* ────────────────────────────────────────────────────────────────────────
 * JURISDICTIONS
 * ──────────────────────────────────────────────────────────────────────── */

interface PassportJurisdictionRow {
  JURISDICTION_ID: string;
  JURISDICTION_NAME: string;
  JURISDICTION_CODE: string;
  MATTER_COUNT: number;
  TOTAL_SPEND: number;
  OPEN_ALERTS: number;
}

const JURISDICTIONS_SQL = `
  -- Passport jurisdictions live in P_JURISDICTION (id, code, display_name).
  -- Matter counts and spend are aggregated through P_MATTER.state_id, which
  -- in this deployment points back to P_JURISDICTION.id.
  SELECT
    CAST(j.id AS NVARCHAR(64))      AS JURISDICTION_ID,
    j.display_name                  AS JURISDICTION_NAME,
    j.code                          AS JURISDICTION_CODE,
    COALESCE(stats.MATTER_COUNT, 0) AS MATTER_COUNT,
    COALESCE(stats.TOTAL_SPEND, 0)  AS TOTAL_SPEND,
    0                               AS OPEN_ALERTS
  FROM P_JURISDICTION j
  LEFT JOIN (
    SELECT
      m.state_id,
      COUNT(*)                            AS MATTER_COUNT,
      SUM(COALESCE(m.spend_to_date_amount, 0)) AS TOTAL_SPEND
    FROM P_MATTER m
    WHERE COALESCE(m.archiv_behavior_is_archived, 0) = 0
    GROUP BY m.state_id
  ) stats ON stats.state_id = j.id
  WHERE COALESCE(j.active, 1) = 1
`;

function mapJurisdictionRow(row: PassportJurisdictionRow, refreshedAt: string): JurisdictionRiskProfile {
  // Risk factors are placeholders — wire to your real model once available.
  const riskFactors = {
    financialExposure: Math.min(100, row.TOTAL_SPEND / 100_000),
    matterComplexity: Math.min(100, row.MATTER_COUNT * 4),
    deadlinePressure: 50,
    regulatoryVolatility: 40,
    vendorPerformanceRisk: 45
  };
  const score = calculateRiskScore(riskFactors);
  return {
    id: row.JURISDICTION_ID,
    name: row.JURISDICTION_NAME,
    code: row.JURISDICTION_CODE,
    overallRiskScore: score,
    riskLevel: getRiskLevel(score),
    trendDirection: "stable",
    topRiskFactors: riskFactors,
    matterCount: row.MATTER_COUNT,
    totalSpend: row.TOTAL_SPEND,
    openAlerts: row.OPEN_ALERTS,
    geometryRef: row.JURISDICTION_CODE,
    lastUpdatedAt: refreshedAt
  };
}

export async function fetchJurisdictions(refreshedAt: string): Promise<JurisdictionRiskProfile[]> {
  const result = await query<PassportJurisdictionRow>(JURISDICTIONS_SQL);
  return result.recordset.map((row) => mapJurisdictionRow(row, refreshedAt));
}

/* ────────────────────────────────────────────────────────────────────────
 * ALERTS — derived from rule violations + thresholds
 * ──────────────────────────────────────────────────────────────────────── */

interface PassportAlertRow {
  ALERT_ID: string;
  JURISDICTION_ID: string;
  MATTER_ID: string | null;
  ALERT_TYPE: string;
  SEVERITY: string;
  STATUS: string;
  MESSAGE: string;
  RECOMMENDED_ACTION: string;
  CREATED_AT: Date;
  UPDATED_AT: Date;
  ESCALATED_AT: Date | null;
}

const ALERTS_SQL = `
  -- TODO: This assumes a custom RR_RISK_ALERT table populated by RiskRadar's
  -- rule engine. If you don't have one yet, derive alerts in code from the
  -- matters dataset (overrun > 25% → critical alert, etc.) — see fallback in
  -- loaders.ts when the table is absent.
  SELECT
    ALERT_ID, JURISDICTION_ID, MATTER_ID, ALERT_TYPE, SEVERITY,
    STATUS, MESSAGE, RECOMMENDED_ACTION, CREATED_AT, UPDATED_AT, ESCALATED_AT
  FROM RR_RISK_ALERT
  ORDER BY CREATED_AT DESC
`;

function mapAlertRow(row: PassportAlertRow): RiskAlert {
  return {
    id: row.ALERT_ID,
    jurisdictionId: row.JURISDICTION_ID,
    matterId: row.MATTER_ID ?? undefined,
    type: (row.ALERT_TYPE as RiskAlert["type"]) ?? "threshold_breach",
    severity: (row.SEVERITY as RiskAlert["severity"]) ?? "medium",
    status: (row.STATUS as RiskAlert["status"]) ?? "unread",
    message: row.MESSAGE,
    recommendedAction: row.RECOMMENDED_ACTION,
    createdAt: row.CREATED_AT.toISOString(),
    updatedAt: row.UPDATED_AT.toISOString(),
    escalatedAt: row.ESCALATED_AT?.toISOString()
  };
}

export async function fetchAlerts(): Promise<RiskAlert[]> {
  const result = await query<PassportAlertRow>(ALERTS_SQL);
  return result.recordset.map(mapAlertRow);
}

/* ────────────────────────────────────────────────────────────────────────
 * TRENDS — invoice spend bucketed by month per jurisdiction
 * ──────────────────────────────────────────────────────────────────────── */

interface PassportTrendRow {
  BUCKET: Date;
  JURISDICTION_ID: string;
  SCORE: number;
}

const TRENDS_SQL = `
  -- Real invoice spend bucketed by month per jurisdiction. Joins:
  --   P_INVOICE_HEADER  -> P_INVOICE_SUMMARY  (dollar totals)
  --   P_INVOICE_HEADER  -> P_MATTER_ORGANIZATION -> P_MATTER  (matter linkage)
  -- Score = SUM(net_amount) / 50_000 normalised to 0-100 per row, capped in
  -- the row mapper to keep it within the riskScore schema.
  -- TODO: confirm P_MATTER_ORGANIZATION column names (matter_id, organization_id).
  SELECT
    DATEFROMPARTS(YEAR(h.invoice_date), MONTH(h.invoice_date), 1) AS BUCKET,
    CAST(m.state_id AS NVARCHAR(64))                              AS JURISDICTION_ID,
    CAST(SUM(COALESCE(s.total_net_amount_amount, 0)) / 50000.0 AS FLOAT) AS SCORE
  FROM P_INVOICE_HEADER h
  INNER JOIN P_INVOICE_SUMMARY s    ON s.invoice_header_id = h.id
  INNER JOIN P_MATTER_ORGANIZATION mo
    ON mo.id = h.matter_org_id
   AND COALESCE(mo.archiv_behavior_is_archived, 0) = 0
   AND COALESCE(mo.is_active, 1) = 1
  INNER JOIN P_MATTER m             ON m.id = mo.matter_id
  WHERE h.invoice_date IS NOT NULL
    AND h.invoice_date >= DATEADD(month, -12, GETDATE())
    AND COALESCE(h.archiv_behavior_is_archived, 0) = 0
    AND COALESCE(h.is_voided, 0) = 0
  GROUP BY DATEFROMPARTS(YEAR(h.invoice_date), MONTH(h.invoice_date), 1), m.state_id
  ORDER BY BUCKET ASC
`;

function mapTrendRow(row: PassportTrendRow, idx: number): RiskTrendPoint {
  const score = Math.max(0, Math.min(100, row.SCORE));
  return {
    id: `${row.JURISDICTION_ID}-${idx}`,
    jurisdictionId: row.JURISDICTION_ID,
    timestamp: row.BUCKET.toISOString(),
    score,
    riskLevel: getRiskLevel(score)
  };
}

export async function fetchTrends(): Promise<RiskTrendPoint[]> {
  const result = await query<PassportTrendRow>(TRENDS_SQL);
  return result.recordset.map((row, idx) => mapTrendRow(row, idx));
}

/* ────────────────────────────────────────────────────────────────────────
 * INVOICE VELOCITY — supports the Matter Briefing endpoint
 * ──────────────────────────────────────────────────────────────────────── */

/** Counts of invoices issued for a single matter and across the whole
 *  portfolio in the last `windowDays` (default 14). The briefing endpoint
 *  uses these to render lines like "7 invoices in 14 days vs portfolio
 *  average of 2". */
export async function fetchInvoiceVelocity(
  matterId: string,
  windowDays = 14
): Promise<{ matterCount: number; portfolioAvg: number }> {
  const result = await query<{ MATTER_INVOICES: number; TOTAL_INVOICES: number; ACTIVE_MATTERS: number }>(
    `
    -- TODO: confirm P_MATTER_ORGANIZATION column names (matter_id, organization_id).
    SELECT
      SUM(CASE WHEN m.id = @matterId THEN 1 ELSE 0 END) AS MATTER_INVOICES,
      COUNT(*)                                          AS TOTAL_INVOICES,
      COUNT(DISTINCT m.id)                              AS ACTIVE_MATTERS
    FROM P_INVOICE_HEADER h
    INNER JOIN P_MATTER_ORGANIZATION mo
      ON mo.id = h.matter_org_id
     AND COALESCE(mo.archiv_behavior_is_archived, 0) = 0
     AND COALESCE(mo.is_active, 1) = 1
    INNER JOIN P_MATTER m ON m.id = mo.matter_id
    WHERE h.invoice_date >= DATEADD(day, -@windowDays, GETDATE())
      AND COALESCE(h.archiv_behavior_is_archived, 0) = 0
      AND COALESCE(h.is_voided, 0) = 0
  `,
    { matterId, windowDays }
  );

  const row = result.recordset[0] ?? { MATTER_INVOICES: 0, TOTAL_INVOICES: 0, ACTIVE_MATTERS: 0 };
  const portfolioAvg = row.ACTIVE_MATTERS > 0 ? Math.round(row.TOTAL_INVOICES / row.ACTIVE_MATTERS) : 0;
  return { matterCount: row.MATTER_INVOICES ?? 0, portfolioAvg };
}

/* ────────────────────────────────────────────────────────────────────────
 * INVOICE QUEUE — recent invoices for one matter (Briefing screen)
 * ──────────────────────────────────────────────────────────────────────── */

/** Total approved (non-archived) budget across every P_MATTER_BUDGET row for
 *  the matter, plus realised spend pulled from invoice summaries. Both numbers
 *  feed the Budget Burn signal on the Briefing screen. */
export async function fetchMatterBudgetSpend(matterId: string): Promise<{ budget: number; spend: number }> {
  const result = await query<{ BUDGET: number | null; SPEND: number | null }>(
    `
    SELECT
      (
        SELECT SUM(COALESCE(mb.amount_amount, 0))
        FROM P_MATTER_BUDGET mb
        WHERE mb.matter_id = @matterId
          AND COALESCE(mb.archiv_behavior_is_archived, 0) = 0
      ) AS BUDGET,
      (
        SELECT SUM(COALESCE(s.total_net_amount_amount, 0))
        FROM P_INVOICE_HEADER h
        INNER JOIN P_INVOICE_SUMMARY s ON s.invoice_header_id = h.id
        INNER JOIN P_MATTER_ORGANIZATION mo
          ON mo.id = h.matter_org_id
         AND COALESCE(mo.archiv_behavior_is_archived, 0) = 0
        WHERE mo.matter_id = @matterId
          AND COALESCE(h.archiv_behavior_is_archived, 0) = 0
          AND COALESCE(h.is_voided, 0) = 0
      ) AS SPEND
    `,
    { matterId }
  );
  const row = result.recordset[0] ?? { BUDGET: 0, SPEND: 0 };
  return { budget: row.BUDGET ?? 0, spend: row.SPEND ?? 0 };
}export interface InvoiceQueueRow {
  invoiceNumber: string;
  invoiceDate: string;
  amount: number;
  status: string;
  hasErrors: boolean;
  isVoided: boolean;
}

interface RawInvoiceQueueRow {
  INVOICE_NUMBER: string;
  INVOICE_DATE: Date;
  AMOUNT: number;
  STATUS_NAME: string | null;
  HAS_ERRORS: number | null;
  IS_VOIDED: number | null;
}

/** Last `limit` invoices billed against this matter, with status name and the
 *  has_errors / is_voided flags surfaced for the rate-card violation indicator
 *  on the Briefing screen. */
export async function fetchRecentInvoices(matterId: string, limit = 6): Promise<InvoiceQueueRow[]> {
  const result = await query<RawInvoiceQueueRow>(
    `
    SELECT TOP (@limit)
      h.invoice_number                                            AS INVOICE_NUMBER,
      h.invoice_date                                              AS INVOICE_DATE,
      COALESCE(s.total_net_amount_amount, 0)                      AS AMOUNT,
      st.name                                                     AS STATUS_NAME,
      h.has_errors                                                AS HAS_ERRORS,
      h.is_voided                                                 AS IS_VOIDED
    FROM P_INVOICE_HEADER h
    INNER JOIN P_MATTER_ORGANIZATION mo
      ON mo.id = h.matter_org_id
     AND COALESCE(mo.archiv_behavior_is_archived, 0) = 0
    LEFT JOIN P_INVOICE_SUMMARY s ON s.invoice_header_id = h.id
    LEFT JOIN P_INVOICE_STATUS  st ON st.id = h.invoice_status_id
    WHERE mo.matter_id = @matterId
      AND COALESCE(h.archiv_behavior_is_archived, 0) = 0
    ORDER BY h.invoice_date DESC
  `,
    { matterId, limit }
  );

  return result.recordset.map((row) => ({
    invoiceNumber: row.INVOICE_NUMBER,
    invoiceDate: row.INVOICE_DATE.toISOString(),
    amount: row.AMOUNT,
    status: row.STATUS_NAME ?? "Unknown",
    hasErrors: !!row.HAS_ERRORS,
    isVoided: !!row.IS_VOIDED
  }));
}

/* ────────────────────────────────────────────────────────────────────────
 * FIRM ANOMALY CONTEXT — Vendor Risk + Compliance signals
 * ──────────────────────────────────────────────────────────────────────── */

export interface FirmAnomalyStats {
  firmInvoiceCount: number;
  firmAnomalyCount: number;
  matterCountForFirm: number;
}

/** Aggregates anomaly metrics across all invoices billed by the same outside
 *  counsel firm that handles this matter. Used to drive Vendor Risk and
 *  Compliance signal scores on the Briefing screen. */
export async function fetchFirmAnomalyStats(matterId: string): Promise<FirmAnomalyStats> {
  const result = await query<{ FIRM_INVOICES: number; FIRM_ANOMALIES: number; MATTER_COUNT: number }>(
    `
    DECLARE @orgId BIGINT;
    SELECT TOP 1 @orgId = mo.organization_id
    FROM P_MATTER_ORGANIZATION mo
    WHERE mo.matter_id = @matterId
      AND COALESCE(mo.archiv_behavior_is_archived, 0) = 0
      AND COALESCE(mo.is_active, 1) = 1
    ORDER BY mo.is_primary DESC, mo.id ASC;

    SELECT
      COUNT(h.id)                                                         AS FIRM_INVOICES,
      SUM(CASE WHEN h.has_errors = 1 OR h.is_voided = 1 THEN 1 ELSE 0 END) AS FIRM_ANOMALIES,
      COUNT(DISTINCT mo2.matter_id)                                       AS MATTER_COUNT
    FROM P_MATTER_ORGANIZATION mo2
    LEFT JOIN P_INVOICE_HEADER h ON h.matter_org_id = mo2.id
                               AND COALESCE(h.archiv_behavior_is_archived, 0) = 0
    WHERE mo2.organization_id = @orgId
      AND COALESCE(mo2.archiv_behavior_is_archived, 0) = 0;
  `,
    { matterId }
  );

  const row = result.recordset[0] ?? { FIRM_INVOICES: 0, FIRM_ANOMALIES: 0, MATTER_COUNT: 0 };
  return {
    firmInvoiceCount: row.FIRM_INVOICES ?? 0,
    firmAnomalyCount: row.FIRM_ANOMALIES ?? 0,
    matterCountForFirm: row.MATTER_COUNT ?? 0
  };
}
