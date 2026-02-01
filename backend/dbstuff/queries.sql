-- this is just for ref

-- see this after schema.sql
-- 5. DQL - data retrieval queries


-- 1. Basic SELECT - View all alerts
SELECT * 
FROM alerts 
ORDER BY timestamp DESC 
LIMIT 10;


-- 2. SELECT with WHERE - Filter attacks only
SELECT 
    alert_id,
    timestamp,
    attack_type,
    confidence,
    status
FROM alerts
WHERE prediction = 'Attack'
ORDER BY confidence DESC;


-- 3. COUNT and GROUP BY - Attack distribution
SELECT 
    attack_type,
    COUNT(*) as total_count,
    ROUND(AVG(confidence)::NUMERIC, 4) as avg_confidence
FROM alerts
GROUP BY attack_type
ORDER BY total_count DESC;


-- 4. JOIN - Alerts with network flows
SELECT 
    a.alert_id,
    a.attack_type,
    a.confidence,
    nf.total_packets,
    nf.total_bytes,
    nf.flow_duration
FROM alerts a
INNER JOIN network_flows nf ON a.alert_id = nf.alert_id
WHERE a.prediction = 'Attack'
ORDER BY a.confidence DESC;


-- 5. Multiple JOINs - Complete alert information
SELECT 
    a.alert_id,
    a.timestamp,
    a.attack_type,
    a.confidence,
    a.source_ip,
    a.destination_ip,
    nf.total_packets,
    nf.total_bytes,
    se.summary
FROM alerts a
INNER JOIN network_flows nf ON a.alert_id = nf.alert_id
INNER JOIN shap_explanations se ON a.alert_id = se.alert_id
WHERE a.prediction = 'Attack'
    AND a.confidence > 0.85
ORDER BY a.confidence DESC
LIMIT 10;


-- 6. JSONB querying - Extract specific features
SELECT 
    nf.alert_id,
    a.attack_type,
    nf.raw_features->>'Destination Port' as dest_port,
    nf.raw_features->>'Flow Duration' as duration,
    nf.raw_features->>'Flow Bytes/s' as bytes_per_sec,
    nf.total_packets
FROM network_flows nf
JOIN alerts a ON nf.alert_id = a.alert_id
WHERE a.prediction = 'Attack';


-- 7. JSONB with filtering - High packet count flows
SELECT 
    alert_id,
    raw_features->>'Total Fwd Packets' as fwd_packets,
    raw_features->>'Total Backward Packets' as bwd_packets
FROM network_flows
WHERE CAST(raw_features->>'Total Fwd Packets' AS INTEGER) > 100;


-- 8. Aggregate with window functions - Attack statistics
SELECT 
    attack_type,
    COUNT(*) as total_count,
    ROUND(AVG(confidence)::NUMERIC, 4) as avg_confidence,
    ROUND(MIN(confidence)::NUMERIC, 4) as min_confidence,
    ROUND(MAX(confidence)::NUMERIC, 4) as max_confidence,
    ROUND(STDDEV(confidence)::NUMERIC, 4) as std_confidence,
    ROUND(
        (COUNT(*) * 100.0 / SUM(COUNT(*)) OVER())::NUMERIC, 
        2
    ) as percentage,
    SUM(COUNT(*)) OVER (
        ORDER BY COUNT(*) DESC
        ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    ) as cumulative_count
FROM alerts
WHERE prediction = 'Attack'
GROUP BY attack_type
ORDER BY total_count DESC;


-- 9. Complex JSONB aggregation - Feature analysis
SELECT 
    a.attack_type,
    COUNT(*) as sample_count,
    ROUND(
        AVG(CAST(nf.raw_features->>'Flow Bytes/s' AS FLOAT))::NUMERIC,
        2
    ) as avg_bytes_per_sec,
    ROUND(
        AVG(CAST(nf.raw_features->>'Flow Packets/s' AS FLOAT))::NUMERIC,
        2
    ) as avg_packets_per_sec,
    ROUND(
        AVG(CAST(nf.raw_features->>'Flow Duration' AS FLOAT))::NUMERIC,
        2
    ) as avg_flow_duration,
    ROUND(
        AVG(CAST(nf.raw_features->>'Total Fwd Packets' AS INTEGER))::NUMERIC,
        2
    ) as avg_fwd_packets
FROM alerts a
JOIN network_flows nf ON a.alert_id = nf.alert_id
WHERE a.prediction = 'Attack'
GROUP BY a.attack_type
HAVING COUNT(*) >= 1
ORDER BY avg_bytes_per_sec DESC;


-- 10. SHAP analysis - Top features across attacks
SELECT 
    feature_data->>'feature' as feature_name,
    COUNT(*) as frequency,
    ROUND(
        AVG(CAST(feature_data->>'abs_shap' AS FLOAT))::NUMERIC, 
        4
    ) as avg_importance
FROM shap_explanations,
     jsonb_array_elements(top_features) as feature_data
GROUP BY feature_data->>'feature'
ORDER BY frequency DESC, avg_importance DESC
LIMIT 10;


-- 11. Time-based analysis - Recent alerts
SELECT 
    DATE_TRUNC('hour', timestamp) as hour,
    attack_type,
    COUNT(*) as alert_count,
    AVG(confidence) as avg_confidence
FROM alerts
WHERE timestamp >= NOW() - INTERVAL '24 hours'
    AND prediction = 'Attack'
GROUP BY DATE_TRUNC('hour', timestamp), attack_type
ORDER BY hour DESC, alert_count DESC;


-- 12. Subquery - Alerts above average confidence
SELECT 
    a.alert_id,
    a.attack_type,
    a.confidence,
    avg_conf.type_avg_confidence,
    ROUND(
        (a.confidence - avg_conf.type_avg_confidence)::NUMERIC, 
        4
    ) as confidence_delta
FROM alerts a
JOIN (
    SELECT 
        attack_type,
        AVG(confidence) as type_avg_confidence
    FROM alerts
    WHERE prediction = 'Attack'
    GROUP BY attack_type
) avg_conf ON a.attack_type = avg_conf.attack_type
WHERE a.confidence > avg_conf.type_avg_confidence
    AND a.prediction = 'Attack'
ORDER BY confidence_delta DESC;


-- 13. CTE (Common Table Expression) - Complex analysis
WITH attack_summary AS (
    SELECT 
        attack_type,
        DATE(timestamp) as attack_date,
        COUNT(*) as daily_count,
        AVG(confidence) as avg_confidence
    FROM alerts
    WHERE prediction = 'Attack'
        AND timestamp >= CURRENT_DATE - INTERVAL '30 days'
    GROUP BY attack_type, DATE(timestamp)
),
ranked_attacks AS (
    SELECT 
        attack_type,
        attack_date,
        daily_count,
        avg_confidence,
        RANK() OVER (
            PARTITION BY attack_type 
            ORDER BY daily_count DESC
        ) as rank
    FROM attack_summary
)
SELECT 
    attack_type,
    attack_date,
    daily_count,
    ROUND(avg_confidence::NUMERIC, 4) as avg_confidence
FROM ranked_attacks
WHERE rank <= 5
ORDER BY attack_type, rank;


-- 14. Status-based filtering - Unreviewed high-severity alerts
SELECT 
    alert_id,
    timestamp,
    attack_type,
    confidence,
    severity_score,
    source_ip,
    destination_ip
FROM alerts
WHERE status = 'unreviewed'
    AND prediction = 'Attack'
    AND severity_score > 80.0
ORDER BY severity_score DESC, confidence DESC;


-- 15. CASE statement - Categorize by severity
SELECT 
    alert_id,
    attack_type,
    confidence,
    CASE 
        WHEN confidence >= 0.95 THEN 'Critical'
        WHEN confidence >= 0.85 THEN 'High'
        WHEN confidence >= 0.70 THEN 'Medium'
        ELSE 'Low'
    END as severity_level,
    status
FROM alerts
WHERE prediction = 'Attack'
ORDER BY confidence DESC;
