/* ============================================================================
   RiskRadar — Invoice activation
   ----------------------------------------------------------------------------
   Two problems remain on the seeded DB:
     1. All 99,985 invoices sit in Draft (status=4). RiskRadar trends, vendor
        anomaly counts, and the Briefing screen all expect SUBMITTED invoices
        (Passport status "Review" id=1, "PostReview" id=2, "Completed" id=3).
     2. Invoice dates are stuck in 2011, so the 12-month trend window is empty.

   This script:
     • Re-dates every invoice across the last 14 months (weighted to the most
       recent 6 months so the trend chart slopes correctly).
     • Moves invoices out of Draft into a realistic mix:
          ~55%  Review        (submitted, awaiting approval)
          ~25%  PostReview    (approved, awaiting payment)
          ~18%  Completed     (paid)
          ~ 2%  remain Draft  (a handful of in-flight items)
     • Flags ~3% of submitted invoices as has_errors=1 to feed Vendor Risk.
     • Aligns each detail-line-item date to its parent invoice's date so the
       briefing's "recent invoices" section reads correctly.

   Idempotent — safe to run repeatedly.
   ============================================================================ */

SET NOCOUNT ON;
PRINT '=== Invoice activation: starting ===';

/* ---- 1) Spread invoice_date over the last 14 months ----------------------- */
PRINT '1) Re-dating invoices...';

;WITH ranked AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY id) AS rn,
           COUNT(*) OVER () AS total
    FROM P_INVOICE_HEADER
)
UPDATE h
SET invoice_date = DATEADD(
        day,
        -- 65% of invoices in the last 6 months, 25% in months 6-12, 10% older.
        CASE
            WHEN r.rn % 100 < 65 THEN -(ABS(CHECKSUM(NEWID())) % 180)               -- last 180 days
            WHEN r.rn % 100 < 90 THEN -(180 + (ABS(CHECKSUM(NEWID())) % 180))       -- 180-360
            ELSE                       -(360 + (ABS(CHECKSUM(NEWID())) % 60))       -- 360-420
        END,
        GETDATE())
FROM P_INVOICE_HEADER h
INNER JOIN ranked r ON r.id = h.id;

PRINT '   ' + CAST(@@ROWCOUNT AS NVARCHAR(20)) + ' invoice dates updated.';

/* ---- 2) Move invoices from Draft into the submitted-onwards lifecycle ---- */
PRINT '2) Submitting invoices (Draft -> Review/PostReview/Completed)...';

;WITH ranked AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY invoice_date DESC, id) AS rn
    FROM P_INVOICE_HEADER
    WHERE invoice_status_id = 4 -- Draft
)
UPDATE h
SET invoice_status_id = CASE
        WHEN r.rn % 100 < 55 THEN 1   -- Review
        WHEN r.rn % 100 < 80 THEN 2   -- PostReview
        WHEN r.rn % 100 < 98 THEN 3   -- Completed
        ELSE 4                         -- a few stay Draft for realism
    END,
    has_errors = CASE WHEN r.rn % 33 = 0 THEN 1 ELSE COALESCE(h.has_errors, 0) END,
    is_voided  = CASE WHEN r.rn % 250 = 0 THEN 1 ELSE COALESCE(h.is_voided, 0) END
FROM P_INVOICE_HEADER h
INNER JOIN ranked r ON r.id = h.id;

PRINT '   ' + CAST(@@ROWCOUNT AS NVARCHAR(20)) + ' invoices transitioned.';

/* ---- 3) Align detail line items to their parent invoice's date ----------- */
PRINT '3) Re-dating detail line items to match parent invoice...';

UPDATE d
SET line_item_date = DATEADD(day, -((d.id) % 14), h.invoice_date)
FROM P_DETAIL_LINE_ITEM d
INNER JOIN P_INVOICE_HEADER h ON h.id = d.header_id
WHERE h.invoice_date IS NOT NULL;

PRINT '   ' + CAST(@@ROWCOUNT AS NVARCHAR(20)) + ' line item dates aligned.';

/* ---- 4) Verification ------------------------------------------------------ */
PRINT '';
PRINT '=== Verification ===';

SELECT 'invoices_total' k, COUNT(*) v FROM P_INVOICE_HEADER
UNION ALL SELECT 'invoices_last_30d',     COUNT(*) FROM P_INVOICE_HEADER WHERE invoice_date >= DATEADD(day,-30,GETDATE())
UNION ALL SELECT 'invoices_last_12m',     COUNT(*) FROM P_INVOICE_HEADER WHERE invoice_date >= DATEADD(month,-12,GETDATE())
UNION ALL SELECT 'invoices_with_errors',  COUNT(*) FROM P_INVOICE_HEADER WHERE has_errors = 1
UNION ALL SELECT 'invoices_voided',       COUNT(*) FROM P_INVOICE_HEADER WHERE is_voided = 1;

SELECT s.id status_id, s.code status_code, s.display_name status_name, COUNT(h.id) invoices
FROM P_INVOICE_STATUS s
LEFT JOIN P_INVOICE_HEADER h ON h.invoice_status_id = s.id
GROUP BY s.id, s.code, s.display_name
ORDER BY s.id;

-- Trends preview: monthly bucket counts the dashboard will receive
SELECT TOP 12
    DATEFROMPARTS(YEAR(h.invoice_date), MONTH(h.invoice_date), 1) AS bucket,
    COUNT(*) AS invoices,
    CAST(SUM(COALESCE(s.total_net_amount_amount, 0)) AS NUMERIC(20,2)) AS total_net
FROM P_INVOICE_HEADER h
INNER JOIN P_INVOICE_SUMMARY s ON s.invoice_header_id = h.id
WHERE h.invoice_date >= DATEADD(month, -12, GETDATE())
  AND COALESCE(h.is_voided, 0) = 0
GROUP BY DATEFROMPARTS(YEAR(h.invoice_date), MONTH(h.invoice_date), 1)
ORDER BY bucket DESC;

PRINT '=== Invoice activation: done ===';
