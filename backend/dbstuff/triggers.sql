-- run after schema.sql

-- 1. Auto-update updated_at column on alerts

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_alerts_timestamp
BEFORE UPDATE ON alerts
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();


-- 2. Auto-calculate severity score

CREATE OR REPLACE FUNCTION calculate_severity_score()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.severity_score IS NULL AND NEW.prediction = 'Attack' THEN
        NEW.severity_score = CASE
            WHEN NEW.attack_type = 'DDoS' THEN NEW.confidence * 100
            WHEN NEW.attack_type = 'DoS' THEN NEW.confidence * 95
            WHEN NEW.attack_type = 'Infiltration' THEN NEW.confidence * 90
            WHEN NEW.attack_type = 'WebAttack' THEN NEW.confidence * 85
            WHEN NEW.attack_type = 'BruteForce' THEN NEW.confidence * 80
            WHEN NEW.attack_type = 'Botnet' THEN NEW.confidence * 85
            WHEN NEW.attack_type = 'Exploit' THEN NEW.confidence * 90
            WHEN NEW.attack_type = 'PortScan' THEN NEW.confidence * 70
            ELSE NEW.confidence * 50
        END;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calculate_severity
BEFORE INSERT OR UPDATE ON alerts
FOR EACH ROW
EXECUTE FUNCTION calculate_severity_score();


-- 3. Audit log for alerts

CREATE OR REPLACE FUNCTION log_alert_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO alert_audit_log
            (alert_id, old_status, new_status, changed_by, action)
        VALUES
            (NEW.alert_id, NULL, NEW.status, 'system', 'INSERT');
        RETURN NEW;
    END IF;

    IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO alert_audit_log
            (alert_id, old_status, new_status, changed_by, action)
        VALUES
            (NEW.alert_id, OLD.status, NEW.status, NEW.reviewed_by, 'UPDATE');
        RETURN NEW;
    END IF;

    IF TG_OP = 'DELETE' THEN
        INSERT INTO alert_audit_log
            (alert_id, old_status, new_status, changed_by, action)
        VALUES
            (OLD.alert_id, OLD.status, NULL, 'system', 'DELETE');
        RETURN OLD;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_audit_alert_changes
AFTER INSERT OR UPDATE OR DELETE ON alerts
FOR EACH ROW
EXECUTE FUNCTION log_alert_status_change();


-- in case of dropping

-- Drop triggers (order does not matter)
DROP TRIGGER IF EXISTS trigger_update_alerts_timestamp ON alerts;
DROP TRIGGER IF EXISTS trigger_calculate_severity ON alerts;
DROP TRIGGER IF EXISTS trigger_audit_alert_changes ON alerts;

-- Drop trigger functions
DROP FUNCTION IF EXISTS update_updated_at_column();
DROP FUNCTION IF EXISTS calculate_severity_score();
DROP FUNCTION IF EXISTS log_alert_status_change();

-- Drop audit log table
-- last,cause triggers/functions must be gone first
DROP TABLE IF EXISTS alert_audit_log;
