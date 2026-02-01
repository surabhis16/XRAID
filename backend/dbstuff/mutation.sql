-- 6. DML - data updates
-- it is just for ref

-- see this after queries.sql

-- UPDATE - Change alert status
UPDATE alerts
SET status = 'investigating',
    reviewed_by = 'analyst_user',
    reviewed_at = CURRENT_TIMESTAMP,
    updated_at = CURRENT_TIMESTAMP
WHERE alert_id = 1;


-- UPDATE - Add analyst notes
UPDATE alerts
SET analyst_notes = 'Confirmed DDoS attack from known malicious IP range. Escalated to security team.',
    updated_at = CURRENT_TIMESTAMP
WHERE alert_id = 1;


-- UPDATE - Bulk status update
UPDATE alerts
SET status = 'resolved',
    updated_at = CURRENT_TIMESTAMP
WHERE attack_type = 'PortScan'
    AND confidence < 0.70
    AND status = 'unreviewed';


-- UPDATE - Calculate severity score
UPDATE alerts
SET severity_score = CASE
    WHEN attack_type = 'DDoS' THEN confidence * 100
    WHEN attack_type = 'DoS' THEN confidence * 95
    WHEN attack_type = 'Infiltration' THEN confidence * 90
    WHEN attack_type = 'WebAttack' THEN confidence * 85
    WHEN attack_type = 'BruteForce' THEN confidence * 80
    WHEN attack_type = 'PortScan' THEN confidence * 70
    WHEN attack_type = 'Botnet' THEN confidence * 85
    WHEN attack_type = 'Exploit' THEN confidence * 90
    ELSE confidence * 50
END,
updated_at = CURRENT_TIMESTAMP
WHERE severity_score IS NULL;



-- 7. DML - data deletion


-- DELETE - Remove specific alert (cascade deletes related records)
DELETE FROM alerts 
WHERE alert_id = 999;


-- DELETE - Remove old benign alerts
DELETE FROM alerts
WHERE attack_type = 'Benign'
    AND timestamp < CURRENT_DATE - INTERVAL '90 days'
    AND status = 'resolved';


-- DELETE - Remove false positives
DELETE FROM alerts
WHERE status = 'false_positive'
    AND timestamp < CURRENT_DATE - INTERVAL '30 days';
