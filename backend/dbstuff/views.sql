-- run after schema.sql

-- 1. Critical Alerts Dashboard

CREATE OR REPLACE VIEW critical_alerts_dashboard AS
SELECT 
    a.alert_id,
    a.timestamp,
    a.attack_type,
    a.confidence,
    a.severity_score,
    a.source_ip,
    a.destination_ip,
    a.destination_port,
    a.protocol,
    a.status,
    CASE 
        WHEN a.confidence >= 0.95 THEN 'Critical'
        WHEN a.confidence >= 0.85 THEN 'High'
        WHEN a.confidence >= 0.70 THEN 'Medium'
        ELSE 'Low'
    END AS threat_level
FROM alerts a
WHERE a.prediction = 'Attack'
  AND a.confidence > 0.75
ORDER BY a.confidence DESC, a.timestamp DESC;


-- 2. Attack Analysis Summary

CREATE OR REPLACE VIEW attack_analysis_summary AS
SELECT 
    a.alert_id,
    a.timestamp,
    a.attack_type,
    a.confidence,
    a.source_ip,
    a.destination_ip,
    a.status,
    nf.total_packets,
    nf.total_bytes,
    nf.flow_duration,
    nf.raw_features->>'Flow Bytes/s' AS bytes_per_sec,
    nf.raw_features->>'Flow Packets/s' AS packets_per_sec,
    se.summary AS explanation
FROM alerts a
JOIN network_flows nf ON a.alert_id = nf.alert_id
LEFT JOIN shap_explanations se ON a.alert_id = se.alert_id
WHERE a.prediction = 'Attack';


-- 3. Daily Attack Statistics

CREATE OR REPLACE VIEW daily_attack_statistics AS
SELECT 
    DATE(timestamp) AS attack_date,
    attack_type,
    COUNT(*) AS total_attacks,
    ROUND(AVG(confidence)::NUMERIC, 4) AS avg_confidence,
    ROUND(MAX(confidence)::NUMERIC, 4) AS max_confidence,
    ROUND(AVG(severity_score)::NUMERIC, 2) AS avg_severity,
    COUNT(CASE WHEN status = 'unreviewed' THEN 1 END) as unreviewed_count,
    COUNT(CASE WHEN status = 'investigating' THEN 1 END) as investigating_count,
    COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolved_count,
    COUNT(CASE WHEN status = 'false_positive' THEN 1 END) as false_positive_count,
    COUNT(CASE WHEN status = 'confirmed' THEN 1 END) as confirmed_count
FROM alerts
WHERE prediction = 'Attack'
  AND timestamp >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(timestamp), attack_type
ORDER BY attack_date DESC, total_attacks DESC;

-- in case of dropping

DROP VIEW IF EXISTS critical_alerts_dashboard;
DROP VIEW IF EXISTS attack_analysis_summary;
DROP VIEW IF EXISTS daily_attack_statistics;
