/* RiskRadar seed — fix-ups for jurisdictions + alert severity spread. */
SET NOCOUNT ON;
PRINT '=== Fix-up: starting ===';

/* ---- 1) P_JURISDICTION uses IDENTITY ─ use IDENTITY_INSERT ON ----------- */
PRINT '1) Inserting US-state jurisdictions (IDENTITY_INSERT)...';

DECLARE @nextId BIGINT = (SELECT COALESCE(MAX(id), 0) FROM P_JURISDICTION) + 1;

SET IDENTITY_INSERT P_JURISDICTION ON;

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
WHERE NOT EXISTS (SELECT 1 FROM P_JURISDICTION j WHERE j.code = us.state_code);

SET IDENTITY_INSERT P_JURISDICTION OFF;

PRINT '   ' + CAST(@@ROWCOUNT AS NVARCHAR(20)) + ' new US-state jurisdictions inserted.';

/* ---- 2) Spread alert severity so the UI shows all four buckets --------- */
PRINT '2) Re-spreading alert severity / status...';

;WITH ranked AS (
    SELECT ALERT_ID, ROW_NUMBER() OVER (ORDER BY CREATED_AT) AS rn
    FROM dbo.RR_RISK_ALERT
)
UPDATE a
SET SEVERITY = CASE r.rn % 10
        WHEN 0 THEN 'critical'
        WHEN 1 THEN 'critical'
        WHEN 2 THEN 'high'
        WHEN 3 THEN 'high'
        WHEN 4 THEN 'high'
        WHEN 5 THEN 'medium'
        WHEN 6 THEN 'medium'
        WHEN 7 THEN 'medium'
        WHEN 8 THEN 'low'
        ELSE         'low'
    END,
    STATUS = CASE r.rn % 7
        WHEN 0 THEN 'unread'
        WHEN 1 THEN 'unread'
        WHEN 2 THEN 'unread'
        WHEN 3 THEN 'read'
        WHEN 4 THEN 'read'
        WHEN 5 THEN 'snoozed'
        ELSE         'escalated'
    END,
    ESCALATED_AT = CASE WHEN r.rn % 7 = 6 THEN DATEADD(hour, -(r.rn % 24), GETDATE()) ELSE NULL END
FROM dbo.RR_RISK_ALERT a
INNER JOIN ranked r ON r.ALERT_ID = a.ALERT_ID;

PRINT '   ' + CAST(@@ROWCOUNT AS NVARCHAR(20)) + ' alerts re-balanced.';

/* ---- Verification ----- */
PRINT '';
SELECT 'jurisdictions_active' metric, COUNT(*) value FROM P_JURISDICTION WHERE active = 1
UNION ALL SELECT 'alerts_severity_critical', COUNT(*) FROM dbo.RR_RISK_ALERT WHERE SEVERITY='critical'
UNION ALL SELECT 'alerts_severity_high',     COUNT(*) FROM dbo.RR_RISK_ALERT WHERE SEVERITY='high'
UNION ALL SELECT 'alerts_severity_medium',   COUNT(*) FROM dbo.RR_RISK_ALERT WHERE SEVERITY='medium'
UNION ALL SELECT 'alerts_severity_low',      COUNT(*) FROM dbo.RR_RISK_ALERT WHERE SEVERITY='low'
UNION ALL SELECT 'alerts_status_unread',     COUNT(*) FROM dbo.RR_RISK_ALERT WHERE STATUS='unread'
UNION ALL SELECT 'alerts_status_escalated',  COUNT(*) FROM dbo.RR_RISK_ALERT WHERE STATUS='escalated';

PRINT '=== Fix-up: done ===';
