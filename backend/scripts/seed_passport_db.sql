/* ============================================================================
   RiskRadar — Passport DB seed script
   ----------------------------------------------------------------------------
   This DB already contains the full Passport schema with:
     • 20,241 matters       (P_MATTER)
     • 80,000 budgets       (P_MATTER_BUDGET)
     • 100,114 invoices     (P_INVOICE_HEADER + P_INVOICE_SUMMARY)
     • 1,011 organisations  (P_ORGANIZATION)
     • 20,242 matter-orgs   (P_MATTER_ORGANIZATION)
     • 51 US states         (P_STATE_PROVINCE where state_code IS NOT NULL)

   What it lacks for RiskRadar:
     1. Every P_MATTER.state_id is NULL  → no map pins, no jurisdiction filters
     2. Every P_MATTER.spend_to_date_amount is 0 / NULL → no risk variance
     3. P_MATTER.description is NULL → empty summary cards
     4. P_JURISDICTION has only "Federal" / "State" → /api/jurisdictions empty
     5. No RR_RISK_ALERT table → /api/alerts has no source

   This script PATCHES the existing data in place. It is idempotent — safe to
   run repeatedly. It never DROPS or DELETES production-shaped tables.
   ============================================================================ */

SET NOCOUNT ON;
PRINT '=== RiskRadar seed: starting ===';

/* ---------------------------------------------------------------------------
   1) Distribute 20K matters across 50 US states (weighted to feel realistic)
   --------------------------------------------------------------------------- */
PRINT '1) Assigning state_id to matters...';

;WITH ranked_states AS (
    SELECT
        id,
        state_code,
        ROW_NUMBER() OVER (ORDER BY id) AS rn
    FROM P_STATE_PROVINCE
    WHERE state_code IS NOT NULL
),
state_count AS (SELECT COUNT(*) AS n FROM ranked_states),
matter_state AS (
    SELECT
        m.id AS matter_id,
        -- Deterministic but pseudo-random distribution. CA / NY / TX / FL get
        -- extra weight so the dashboard map looks alive.
        CASE m.id % 20
            WHEN 0 THEN 5   -- California (always)
            WHEN 1 THEN 5
            WHEN 2 THEN 36  -- New York
            WHEN 3 THEN 36
            WHEN 4 THEN 49  -- Texas
            WHEN 5 THEN 11  -- Florida
            ELSE ((ABS(CAST(HASHBYTES('MD5', CAST(m.id AS VARBINARY(8))) AS BIGINT))) % 50) + 1
        END AS rn
    FROM P_MATTER m
    WHERE m.state_id IS NULL
)
UPDATE m
SET state_id = rs.id
FROM P_MATTER m
INNER JOIN matter_state ms ON ms.matter_id = m.id
INNER JOIN ranked_states rs ON rs.rn = ((ms.rn - 1) % (SELECT n FROM state_count)) + 1;

PRINT '   ' + CAST(@@ROWCOUNT AS NVARCHAR(20)) + ' matters now linked to a US state.';

/* ---------------------------------------------------------------------------
   2) Populate spend_to_date_amount so the risk scoring buckets light up.
      Mix: ~30% healthy (under budget), ~50% warning (0-25% over),
           ~20% critical (25%+ over).
   --------------------------------------------------------------------------- */
PRINT '2) Seeding spend_to_date_amount based on budget totals...';

;WITH budget_total AS (
    SELECT
        matter_id,
        SUM(COALESCE(amount_amount, 0)) AS total_budget
    FROM P_MATTER_BUDGET
    WHERE COALESCE(archiv_behavior_is_archived, 0) = 0
      AND amount_amount > 0
    GROUP BY matter_id
)
UPDATE m
SET spend_to_date_amount = CAST(
    bt.total_budget *
    CASE (ABS(CAST(HASHBYTES('MD5', CAST(m.id AS VARBINARY(8))) AS INT)) % 100)
        -- 30% healthy: 0.40 - 0.95 of budget
        WHEN  0 THEN 0.42  WHEN  1 THEN 0.51  WHEN  2 THEN 0.58  WHEN  3 THEN 0.63
        WHEN  4 THEN 0.69  WHEN  5 THEN 0.74  WHEN  6 THEN 0.79  WHEN  7 THEN 0.83
        WHEN  8 THEN 0.87  WHEN  9 THEN 0.91  WHEN 10 THEN 0.45  WHEN 11 THEN 0.55
        WHEN 12 THEN 0.66  WHEN 13 THEN 0.72  WHEN 14 THEN 0.78  WHEN 15 THEN 0.84
        WHEN 16 THEN 0.88  WHEN 17 THEN 0.93  WHEN 18 THEN 0.95  WHEN 19 THEN 0.50
        WHEN 20 THEN 0.60  WHEN 21 THEN 0.70  WHEN 22 THEN 0.80  WHEN 23 THEN 0.90
        WHEN 24 THEN 0.65  WHEN 25 THEN 0.75  WHEN 26 THEN 0.85  WHEN 27 THEN 0.95
        WHEN 28 THEN 0.48  WHEN 29 THEN 0.92
        -- 50% warning: 1.00 - 1.24 of budget
        WHEN 30 THEN 1.02  WHEN 31 THEN 1.05  WHEN 32 THEN 1.08  WHEN 33 THEN 1.10
        WHEN 34 THEN 1.12  WHEN 35 THEN 1.14  WHEN 36 THEN 1.16  WHEN 37 THEN 1.18
        WHEN 38 THEN 1.20  WHEN 39 THEN 1.22  WHEN 40 THEN 1.03  WHEN 41 THEN 1.06
        WHEN 42 THEN 1.09  WHEN 43 THEN 1.11  WHEN 44 THEN 1.13  WHEN 45 THEN 1.15
        WHEN 46 THEN 1.17  WHEN 47 THEN 1.19  WHEN 48 THEN 1.21  WHEN 49 THEN 1.23
        WHEN 50 THEN 1.04  WHEN 51 THEN 1.07  WHEN 52 THEN 1.13  WHEN 53 THEN 1.18
        WHEN 54 THEN 1.21  WHEN 55 THEN 1.05  WHEN 56 THEN 1.10  WHEN 57 THEN 1.15
        WHEN 58 THEN 1.20  WHEN 59 THEN 1.24  WHEN 60 THEN 1.01  WHEN 61 THEN 1.06
        WHEN 62 THEN 1.11  WHEN 63 THEN 1.16  WHEN 64 THEN 1.21  WHEN 65 THEN 1.04
        WHEN 66 THEN 1.09  WHEN 67 THEN 1.14  WHEN 68 THEN 1.19  WHEN 69 THEN 1.22
        WHEN 70 THEN 1.02  WHEN 71 THEN 1.07  WHEN 72 THEN 1.12  WHEN 73 THEN 1.17
        WHEN 74 THEN 1.20  WHEN 75 THEN 1.06  WHEN 76 THEN 1.11  WHEN 77 THEN 1.16
        WHEN 78 THEN 1.20  WHEN 79 THEN 1.23
        -- 20% critical: 1.25 - 2.10 of budget
        WHEN 80 THEN 1.27  WHEN 81 THEN 1.32  WHEN 82 THEN 1.40  WHEN 83 THEN 1.45
        WHEN 84 THEN 1.55  WHEN 85 THEN 1.62  WHEN 86 THEN 1.70  WHEN 87 THEN 1.78
        WHEN 88 THEN 1.85  WHEN 89 THEN 1.95  WHEN 90 THEN 1.30  WHEN 91 THEN 1.42
        WHEN 92 THEN 1.50  WHEN 93 THEN 1.60  WHEN 94 THEN 1.72  WHEN 95 THEN 1.80
        WHEN 96 THEN 1.92  WHEN 97 THEN 2.00  WHEN 98 THEN 2.05  WHEN 99 THEN 2.10
        ELSE 1.00
    END
    AS NUMERIC(28, 6))
FROM P_MATTER m
INNER JOIN budget_total bt ON bt.matter_id = m.id
WHERE COALESCE(m.archiv_behavior_is_archived, 0) = 0;

PRINT '   ' + CAST(@@ROWCOUNT AS NVARCHAR(20)) + ' matters now have a realistic spend_to_date_amount.';

/* ---------------------------------------------------------------------------
   3) Give matters a meaningful description (used as the matter "summary").
   --------------------------------------------------------------------------- */
PRINT '3) Filling in matter descriptions...';

UPDATE P_MATTER
SET description = CONCAT(
    CASE m.id % 8
        WHEN 0 THEN 'Complex commercial dispute involving '
        WHEN 1 THEN 'Regulatory compliance review for '
        WHEN 2 THEN 'Cross-border M&A transaction support for '
        WHEN 3 THEN 'Intellectual property litigation regarding '
        WHEN 4 THEN 'Class action defense related to '
        WHEN 5 THEN 'Employment & labour matter concerning '
        WHEN 6 THEN 'Tax controversy work on '
        ELSE         'Data-privacy enforcement engagement on '
    END,
    COALESCE(name, matter_number, CONCAT('Matter ', m.id)),
    '. Active engagement with outside counsel; budget tracked in P_MATTER_BUDGET.'
)
FROM P_MATTER m
WHERE m.description IS NULL OR LTRIM(RTRIM(m.description)) = '';

PRINT '   ' + CAST(@@ROWCOUNT AS NVARCHAR(20)) + ' matter descriptions populated.';

/* ---------------------------------------------------------------------------
   4) Add 51 US-state jurisdictions to P_JURISDICTION so /api/jurisdictions
      returns one row per state.
   --------------------------------------------------------------------------- */
PRINT '4) Seeding P_JURISDICTION with US states...';

DECLARE @nextId BIGINT = (SELECT COALESCE(MAX(id), 0) FROM P_JURISDICTION) + 1;

;WITH us_states AS (
    SELECT state_code, state, ROW_NUMBER() OVER (ORDER BY state_code) AS rn
    FROM P_STATE_PROVINCE
    WHERE state_code IS NOT NULL
)
INSERT INTO P_JURISDICTION
    (id, active, code, created_at, created_by, display_name, updated_at, updated_by, dtype, read_permission, instance_version)
SELECT
    @nextId + (us.rn - 1),
    1,
    us.state_code,
    GETDATE(),
    'riskradar-seed',
    us.state,
    GETDATE(),
    'riskradar-seed',
    'JurisdictionExt',
    NULL,
    1
FROM us_states us
WHERE NOT EXISTS (
    SELECT 1 FROM P_JURISDICTION j WHERE j.code = us.state_code
);

PRINT '   ' + CAST(@@ROWCOUNT AS NVARCHAR(20)) + ' new US-state jurisdictions inserted.';

/* ---------------------------------------------------------------------------
   5) RR_RISK_ALERT — RiskRadar's own table for /api/alerts.
      Created here (idempotent) and populated with ~150 rich alerts.
   --------------------------------------------------------------------------- */
PRINT '5) Building RR_RISK_ALERT...';

IF OBJECT_ID('dbo.RR_RISK_ALERT', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.RR_RISK_ALERT (
        ALERT_ID            NVARCHAR(64)  NOT NULL PRIMARY KEY,
        JURISDICTION_ID     NVARCHAR(64)  NOT NULL,
        MATTER_ID           NVARCHAR(64)  NULL,
        ALERT_TYPE          NVARCHAR(40)  NOT NULL,
        SEVERITY            NVARCHAR(16)  NOT NULL,
        STATUS              NVARCHAR(16)  NOT NULL,
        MESSAGE             NVARCHAR(500) NOT NULL,
        RECOMMENDED_ACTION  NVARCHAR(500) NOT NULL,
        CREATED_AT          DATETIME      NOT NULL,
        UPDATED_AT          DATETIME      NOT NULL,
        ESCALATED_AT        DATETIME      NULL
    );
    CREATE INDEX IX_RR_RISK_ALERT_JUR    ON dbo.RR_RISK_ALERT (JURISDICTION_ID);
    CREATE INDEX IX_RR_RISK_ALERT_MATTER ON dbo.RR_RISK_ALERT (MATTER_ID);
    PRINT '   RR_RISK_ALERT table created.';
END
ELSE
BEGIN
    PRINT '   RR_RISK_ALERT already exists — re-seeding rows.';
    DELETE FROM dbo.RR_RISK_ALERT;
END

-- Generate ~150 alerts pulled from the most-overrun matters so they tie back
-- to real, visible matters in the UI.
;WITH overrun_matters AS (
    SELECT TOP 200
        CAST(m.id AS NVARCHAR(64))           AS matter_id,
        CAST(m.state_id AS NVARCHAR(64))     AS jurisdiction_id,
        m.name                                AS matter_name,
        m.spend_to_date_amount                AS spend,
        bt.total_budget,
        ((m.spend_to_date_amount - bt.total_budget) / NULLIF(bt.total_budget, 0)) * 100.0 AS overrun_pct,
        ROW_NUMBER() OVER (ORDER BY ((m.spend_to_date_amount - bt.total_budget) / NULLIF(bt.total_budget, 0)) DESC, m.id) AS rn
    FROM P_MATTER m
    INNER JOIN (
        SELECT matter_id, SUM(COALESCE(amount_amount, 0)) AS total_budget
        FROM P_MATTER_BUDGET
        WHERE COALESCE(archiv_behavior_is_archived, 0) = 0
          AND amount_amount > 0
        GROUP BY matter_id
    ) bt ON bt.matter_id = m.id
    WHERE m.state_id IS NOT NULL
      AND COALESCE(m.archiv_behavior_is_archived, 0) = 0
      AND m.close_date IS NULL
      AND bt.total_budget > 0
      AND m.spend_to_date_amount > bt.total_budget
    ORDER BY ((m.spend_to_date_amount - bt.total_budget) / NULLIF(bt.total_budget, 0)) DESC
)
INSERT INTO dbo.RR_RISK_ALERT
    (ALERT_ID, JURISDICTION_ID, MATTER_ID, ALERT_TYPE, SEVERITY, STATUS,
     MESSAGE, RECOMMENDED_ACTION, CREATED_AT, UPDATED_AT, ESCALATED_AT)
SELECT
    CONCAT('alert-', om.matter_id, '-', om.rn),
    om.jurisdiction_id,
    om.matter_id,
    CASE om.rn % 4
        WHEN 0 THEN 'threshold_breach'
        WHEN 1 THEN 'spend_anomaly'
        WHEN 2 THEN 'regulatory_change'
        ELSE         'deadline_risk'
    END,
    CASE
        WHEN om.overrun_pct >= 50 THEN 'critical'
        WHEN om.overrun_pct >= 25 THEN 'high'
        WHEN om.overrun_pct >= 10 THEN 'medium'
        ELSE 'low'
    END,
    CASE om.rn % 5
        WHEN 0 THEN 'unread'
        WHEN 1 THEN 'unread'
        WHEN 2 THEN 'read'
        WHEN 3 THEN 'snoozed'
        ELSE         'escalated'
    END,
    CONCAT('Matter "', LEFT(om.matter_name, 60), '" is tracking ',
           CAST(CAST(om.overrun_pct AS DECIMAL(10, 1)) AS NVARCHAR(20)),
           '% over its approved budget of $',
           FORMAT(om.total_budget, 'N0'), '.'),
    CASE om.rn % 4
        WHEN 0 THEN 'Schedule a budget review with the engagement partner this week.'
        WHEN 1 THEN 'Audit the most recent invoice batch for rate-card compliance.'
        WHEN 2 THEN 'Brief the GC on potential regulatory exposure tied to this matter.'
        ELSE         'Confirm upcoming filing deadlines with outside counsel.'
    END,
    DATEADD(hour, -(om.rn % 168), GETDATE()),
    DATEADD(hour, -(om.rn % 72),  GETDATE()),
    CASE WHEN om.rn % 5 = 4 THEN DATEADD(hour, -(om.rn % 24), GETDATE()) ELSE NULL END
FROM overrun_matters om;

PRINT '   ' + CAST(@@ROWCOUNT AS NVARCHAR(20)) + ' alerts inserted.';

/* ---------------------------------------------------------------------------
   6) Quick verification block — print summary counts that the project relies on.
   --------------------------------------------------------------------------- */
PRINT '';
PRINT '=== Verification ===';

SELECT 'matters_with_state'        AS metric, COUNT(*) AS value FROM P_MATTER WHERE state_id IS NOT NULL AND close_date IS NULL
UNION ALL SELECT 'matters_with_spend',           COUNT(*) FROM P_MATTER WHERE spend_to_date_amount > 0 AND close_date IS NULL
UNION ALL SELECT 'matters_with_summary',         COUNT(*) FROM P_MATTER WHERE description IS NOT NULL AND close_date IS NULL
UNION ALL SELECT 'jurisdictions_active',         COUNT(*) FROM P_JURISDICTION WHERE active = 1
UNION ALL SELECT 'alerts_total',                 COUNT(*) FROM dbo.RR_RISK_ALERT
UNION ALL SELECT 'alerts_unread',                COUNT(*) FROM dbo.RR_RISK_ALERT WHERE STATUS = 'unread'
UNION ALL SELECT 'alerts_critical',              COUNT(*) FROM dbo.RR_RISK_ALERT WHERE SEVERITY = 'critical';

-- Distribution preview: how matters land across the three risk buckets.
;WITH bucketed AS (
    SELECT
        CASE
            WHEN COALESCE(b.budget, 0) = 0 THEN 'no-budget'
            WHEN ((m.spend_to_date_amount - b.budget) / b.budget) * 100 >= 25 THEN 'critical'
            WHEN ((m.spend_to_date_amount - b.budget) / b.budget) * 100 >= 0  THEN 'warning'
            ELSE 'healthy'
        END AS bucket
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
SELECT bucket, COUNT(*) AS matters
FROM bucketed
GROUP BY bucket
ORDER BY matters DESC;

PRINT '=== RiskRadar seed: done ===';
