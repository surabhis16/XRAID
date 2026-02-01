-- 8. Administrative Queries

-- see this after mutation.sql

-- View table structure
\d alerts
\d network_flows
\d shap_explanations


-- Detailed table information
\d+ alerts
\d+ network_flows
\d+ shap_explanations


-- List all tables
\dt


-- List all indexes
\di


-- List all constraints
\dC


-- View constraints on alerts table
SELECT 
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(oid) as definition
FROM pg_constraint 
WHERE conrelid = 'alerts'::regclass;


-- View indexes on alerts table
SELECT 
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'alerts'
ORDER BY indexname;


-- View foreign key relationships
SELECT
    tc.table_name, 
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    rc.delete_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.referential_constraints AS rc
    ON tc.constraint_name = rc.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON rc.constraint_name = ccu.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY';



-- Database statistics


-- Total record counts
SELECT 
    'alerts' as table_name, 
    COUNT(*) as record_count 
FROM alerts
UNION ALL
SELECT 
    'network_flows', 
    COUNT(*) 
FROM network_flows
UNION ALL
SELECT 
    'shap_explanations', 
    COUNT(*) 
FROM shap_explanations;


-- Table sizes
SELECT 
    tablename as table_name,
    pg_size_pretty(
        pg_total_relation_size(schemaname||'.'||tablename)
    ) as total_size,
    pg_size_pretty(
        pg_relation_size(schemaname||'.'||tablename)
    ) as table_size,
    pg_size_pretty(
        pg_total_relation_size(schemaname||'.'||tablename) - 
        pg_relation_size(schemaname||'.'||tablename)
    ) as indexes_size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;


-- Index usage statistics
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan as index_scans,
    idx_tup_read as tuples_read,
    idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;


-- Database connection info
SELECT 
    datname as database_name,
    usename as user_name,
    application_name,
    client_addr,
    state,
    query_start
FROM pg_stat_activity
WHERE datname = 'xraid';



-- 9. Testing and Validation Queries


-- Test CASCADE DELETE
BEGIN;
    INSERT INTO alerts (
        prediction,
        attack_type,
        confidence,
        rf_confidence,
        if_confidence,
        ae_reconstruction_error
    )
    VALUES (
        'Attack', 'DDoS', 0.95, 0.95, -1.0, 100.0
    )
    RETURNING alert_id;

    INSERT INTO network_flows (alert_id, raw_features)
    VALUES (currval('alerts_alert_id_seq'), '{}'::jsonb);

    INSERT INTO shap_explanations (
        alert_id, shap_values, top_features, summary
    )
    VALUES (
        currval('alerts_alert_id_seq'),
        '[]'::jsonb,
        '[]'::jsonb,
        'Test'
    );

    DELETE FROM alerts 
    WHERE alert_id = currval('alerts_alert_id_seq');
ROLLBACK;


-- Test CHECK constraints (expected to fail)

-- confidence > 1.0
INSERT INTO alerts (
    prediction, attack_type, confidence, rf_confidence, 
    if_confidence, ae_reconstruction_error
)
VALUES ('Attack', 'DDoS', 1.5, 0.95, -1.0, 100.0);


-- invalid port
INSERT INTO alerts (
    prediction, attack_type, confidence, rf_confidence, 
    if_confidence, ae_reconstruction_error, source_port
)
VALUES ('Attack', 'DDoS', 0.95, 0.95, -1.0, 100.0, 70000);


-- invalid status
INSERT INTO alerts (
    prediction, attack_type, confidence, rf_confidence, 
    if_confidence, ae_reconstruction_error, status
)
VALUES ('Attack', 'DDoS', 0.95, 0.95, -1.0, 100.0, 'invalid_status');


-- Verify referential integrity (expected to fail)
INSERT INTO network_flows (alert_id, raw_features)
VALUES (9999, '{}'::jsonb);



-- 10. Performance Analysis Queries


EXPLAIN ANALYZE
SELECT 
    a.alert_id,
    a.attack_type,
    a.confidence,
    nf.total_packets
FROM alerts a
JOIN network_flows nf 
    ON a.alert_id = nf.alert_id
WHERE a.prediction = 'Attack' 
    AND a.confidence > 0.9
ORDER BY a.confidence DESC
LIMIT 10;


-- Find missing indexes (heuristic)
SELECT 
    schemaname,
    tablename,
    attname,
    n_distinct,
    correlation
FROM pg_stats
WHERE schemaname = 'public'
    AND n_distinct > 100
    AND correlation < 0.1;



-- 11. Backup n Maintenance


-- Export data to CSV
\copy (
    SELECT * FROM alerts WHERE prediction = 'Attack'
) TO '/tmp/attacks.csv' CSV HEADER;

\copy (
    SELECT * FROM alerts
) TO '/tmp/all_alerts.csv' CSV HEADER;


-- Vacuum and analyze
VACUUM ANALYZE alerts;
VACUUM ANALYZE network_flows;
VACUUM ANALYZE shap_explanations;


-- Reindex tables
REINDEX TABLE alerts;
REINDEX TABLE network_flows;
REINDEX TABLE shap_explanations;
