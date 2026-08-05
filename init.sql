-- Database Initialization
-- Pure SQL for Docker postgres init

-- Grant privileges
GRANT ALL ON SCHEMA public TO xraid_user;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
GRANT ALL ON TABLES TO xraid_user;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
GRANT ALL ON SEQUENCES TO xraid_user;

-- TABLES

CREATE TABLE IF NOT EXISTS alerts (
    alert_id SERIAL PRIMARY KEY,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    prediction VARCHAR(50) NOT NULL,
    attack_type VARCHAR(50) NOT NULL,
    confidence FLOAT NOT NULL,
    rf_confidence FLOAT NOT NULL,
    if_confidence FLOAT NOT NULL,
    ae_reconstruction_error FLOAT NOT NULL,
    source_ip INET,
    source_port INTEGER,
    destination_ip INET,
    destination_port INTEGER,
    protocol VARCHAR(10),
    status VARCHAR(20) NOT NULL DEFAULT 'unreviewed',
    severity_score FLOAT,
    analyst_notes TEXT,
    reviewed_by VARCHAR(100),
    reviewed_at TIMESTAMPTZ,

    CONSTRAINT check_confidence_range CHECK (confidence BETWEEN 0.0 AND 1.0),
    CONSTRAINT check_rf_confidence_range CHECK (rf_confidence BETWEEN 0.0 AND 1.0),
    CONSTRAINT check_if_confidence_range CHECK (if_confidence BETWEEN -1.0 AND 1.0),
    CONSTRAINT check_ae_error_positive CHECK (ae_reconstruction_error >= 0.0),
    CONSTRAINT check_severity_range CHECK (severity_score IS NULL OR severity_score BETWEEN 0.0 AND 100.0),
    CONSTRAINT check_status_valid CHECK (status IN ('unreviewed', 'investigating', 'resolved', 'false_positive')),
    CONSTRAINT check_prediction_valid CHECK (prediction IN ('Attack', 'Benign')),
    CONSTRAINT check_attack_type_valid CHECK (
        attack_type IN ('Benign','DDoS','DoS','PortScan','BruteForce','WebAttack','Botnet','Infiltration','Exploit')
    ),
    CONSTRAINT check_source_port_range CHECK (source_port IS NULL OR source_port BETWEEN 0 AND 65535),
    CONSTRAINT check_dest_port_range CHECK (destination_port IS NULL OR destination_port BETWEEN 0 AND 65535),
    CONSTRAINT check_review_consistency CHECK (
        status = 'unreviewed' OR (reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL)
    )
);

CREATE TABLE IF NOT EXISTS network_flows (
    flow_id SERIAL PRIMARY KEY,
    alert_id INTEGER NOT NULL UNIQUE,
    raw_features JSONB NOT NULL,
    total_packets INTEGER,
    total_bytes INTEGER,
    flow_duration FLOAT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_network_flows_alert FOREIGN KEY (alert_id) REFERENCES alerts(alert_id) ON DELETE CASCADE,
    CONSTRAINT check_packets_positive CHECK (total_packets IS NULL OR total_packets >= 0),
    CONSTRAINT check_bytes_positive CHECK (total_bytes IS NULL OR total_bytes >= 0),
    CONSTRAINT check_duration_positive CHECK (flow_duration IS NULL OR flow_duration >= 0)
);

CREATE TABLE IF NOT EXISTS shap_explanations (
    explanation_id SERIAL PRIMARY KEY,
    alert_id INTEGER NOT NULL UNIQUE,
    shap_values JSONB NOT NULL,
    top_features JSONB NOT NULL,
    summary TEXT NOT NULL,
    generated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    model_version VARCHAR(20),

    CONSTRAINT fk_shap_explanations_alert FOREIGN KEY (alert_id) REFERENCES alerts(alert_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS alert_audit_log (
    audit_id SERIAL PRIMARY KEY,
    alert_id INTEGER NOT NULL,
    old_status VARCHAR(20),
    new_status VARCHAR(20),
    changed_by VARCHAR(100),
    changed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    action VARCHAR(20) NOT NULL,

    CONSTRAINT fk_alert_audit_log_alert
        FOREIGN KEY (alert_id)
        REFERENCES alerts(alert_id)
        ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS users (
    user_id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100),
    role VARCHAR(20) NOT NULL DEFAULT 'analyst',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMPTZ,
    CONSTRAINT check_role_valid CHECK (role IN ('admin', 'analyst', 'viewer'))
);

-- INDEXES

CREATE INDEX IF NOT EXISTS idx_alerts_timestamp ON alerts(timestamp);
CREATE INDEX IF NOT EXISTS idx_alerts_attack_type ON alerts(attack_type);
CREATE INDEX IF NOT EXISTS idx_alerts_status ON alerts(status);
CREATE INDEX IF NOT EXISTS idx_alerts_prediction ON alerts(prediction);
CREATE INDEX IF NOT EXISTS idx_alerts_source_ip ON alerts(source_ip);
CREATE INDEX IF NOT EXISTS idx_alerts_destination_ip ON alerts(destination_ip);
CREATE INDEX IF NOT EXISTS idx_timestamp_attack_type ON alerts(timestamp, attack_type);
CREATE INDEX IF NOT EXISTS idx_status_timestamp ON alerts(status, timestamp);
CREATE INDEX IF NOT EXISTS idx_prediction_confidence ON alerts(prediction, confidence);
CREATE INDEX IF NOT EXISTS idx_attack_type_severity ON alerts(attack_type, severity_score);
CREATE INDEX IF NOT EXISTS idx_source_dest_ip ON alerts(source_ip, destination_ip);

CREATE INDEX IF NOT EXISTS idx_network_flows_alert ON network_flows(alert_id);
CREATE INDEX IF NOT EXISTS idx_network_flows_created ON network_flows(created_at);
CREATE INDEX IF NOT EXISTS idx_network_flows_features ON network_flows USING GIN(raw_features);

CREATE INDEX IF NOT EXISTS idx_shap_alert ON shap_explanations(alert_id);
CREATE INDEX IF NOT EXISTS idx_shap_generated_at ON shap_explanations(generated_at);
CREATE INDEX IF NOT EXISTS idx_shap_values ON shap_explanations USING GIN(shap_values);
CREATE INDEX IF NOT EXISTS idx_shap_top_features ON shap_explanations USING GIN(top_features);
CREATE INDEX IF NOT EXISTS idx_alert_audit_log_alert ON alert_audit_log(alert_id);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- TRIGGERS

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trigger_update_timestamp
    BEFORE UPDATE ON alerts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE FUNCTION calculate_severity_score()
RETURNS TRIGGER AS $$
BEGIN
    NEW.severity_score = CASE
        WHEN NEW.confidence >= 0.9 THEN 80 + (NEW.confidence * 20)
        WHEN NEW.confidence >= 0.7 THEN 60 + (NEW.confidence * 20)
        WHEN NEW.confidence >= 0.5 THEN 40 + (NEW.confidence * 20)
        ELSE NEW.confidence * 40
    END;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trigger_severity_score
    BEFORE INSERT OR UPDATE OF confidence ON alerts
    FOR EACH ROW
    EXECUTE FUNCTION calculate_severity_score();

CREATE OR REPLACE FUNCTION log_alert_audit()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO alert_audit_log (alert_id, old_status, new_status, changed_by, action)
        VALUES (NEW.alert_id, OLD.status, NEW.status, NEW.reviewed_by, 'STATUS_CHANGE');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trigger_audit_log
    AFTER UPDATE ON alerts
    FOR EACH ROW
    EXECUTE FUNCTION log_alert_audit();

-- VIEWS

CREATE OR REPLACE VIEW critical_alerts_dashboard AS
SELECT alert_id, timestamp, attack_type, confidence, severity_score, status, source_ip, destination_ip
FROM alerts
WHERE prediction = 'Attack' AND severity_score >= 80
ORDER BY timestamp DESC;

CREATE OR REPLACE VIEW attack_analysis_summary AS
SELECT
    attack_type,
    COUNT(*) AS total,
    ROUND(AVG(confidence)::numeric, 4) AS avg_confidence,
    ROUND(AVG(severity_score)::numeric, 2) AS avg_severity,
    COUNT(*) FILTER (WHERE status = 'resolved') AS resolved,
    COUNT(*) FILTER (WHERE status = 'false_positive') AS false_positives
FROM alerts
WHERE prediction = 'Attack'
GROUP BY attack_type
ORDER BY total DESC;

CREATE OR REPLACE VIEW daily_attack_statistics AS
SELECT
    DATE(timestamp) AS date,
    COUNT(*) AS total_alerts,
    COUNT(*) FILTER (WHERE prediction = 'Attack') AS attacks,
    COUNT(*) FILTER (WHERE prediction = 'Benign') AS benign,
    ROUND(AVG(confidence)::numeric, 4) AS avg_confidence
FROM alerts
GROUP BY DATE(timestamp)
ORDER BY date DESC;

GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO xraid_user;

GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO xraid_user;

-- DEFAULT ADMIN USER
-- Password: admin123
-- for local development only; in production, create users through the application interface or a secure process
-- remove this seed user before deploying to production
INSERT INTO users (email, password_hash, full_name, role)
VALUES (
    'admin@xraid.io',
    '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW',
    'Admin',
    'admin'
) ON CONFLICT (email) DO NOTHING;