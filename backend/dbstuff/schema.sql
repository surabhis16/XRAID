-- 1. db setup and initial config

CREATE DATABASE xraid;

CREATE USER xraid_user WITH PASSWORD 'xraid_secure_pass';
GRANT ALL PRIVILEGES ON DATABASE xraid TO xraid_user;
GRANT ALL ON SCHEMA public TO xraid_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO xraid_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO xraid_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO xraid_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO xraid_user;
ALTER DATABASE xraid OWNER TO xraid_user;

\c xraid;


-- 2. DDL - table creation

CREATE TABLE alerts (
    alert_id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    prediction VARCHAR(50) NOT NULL,
    attack_type VARCHAR(50) NOT NULL,
    confidence FLOAT NOT NULL,
    rf_confidence FLOAT NOT NULL,
    if_confidence FLOAT NOT NULL,
    ae_reconstruction_error FLOAT NOT NULL,
    source_ip VARCHAR(45),
    source_port INTEGER,
    destination_ip VARCHAR(45),
    destination_port INTEGER,
    protocol VARCHAR(10),
    status VARCHAR(20) NOT NULL DEFAULT 'unreviewed',
    severity_score FLOAT,
    analyst_notes TEXT,
    reviewed_by VARCHAR(100),
    reviewed_at TIMESTAMP,

    CONSTRAINT check_confidence_range CHECK (confidence BETWEEN 0.0 AND 1.0),
    CONSTRAINT check_rf_confidence_range CHECK (rf_confidence BETWEEN 0.0 AND 1.0),
    CONSTRAINT check_if_confidence_range CHECK (if_confidence BETWEEN -1.0 AND 1.0),
    CONSTRAINT check_ae_error_positive CHECK (ae_reconstruction_error >= 0.0),
    CONSTRAINT check_severity_range CHECK (
        severity_score IS NULL OR severity_score BETWEEN 0.0 AND 100.0
    ),
    CONSTRAINT check_status_valid CHECK (
        status IN ('unreviewed', 'investigating', 'resolved', 'false_positive')
    ),
    CONSTRAINT check_prediction_valid CHECK (prediction IN ('Attack', 'Benign')),
    CONSTRAINT check_attack_type_valid CHECK (
        attack_type IN (
            'Benign','DDoS','DoS','PortScan','BruteForce',
            'WebAttack','Botnet','Infiltration','Exploit'
        )
    ),
    CONSTRAINT check_source_port_range CHECK (
        source_port IS NULL OR source_port BETWEEN 0 AND 65535
    ),
    CONSTRAINT check_dest_port_range CHECK (
        destination_port IS NULL OR destination_port BETWEEN 0 AND 65535
    ),
    CONSTRAINT check_review_consistency CHECK (
        status = 'unreviewed'
        OR (reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL)
    )
);


CREATE TABLE network_flows (
    flow_id SERIAL PRIMARY KEY,
    alert_id INTEGER NOT NULL UNIQUE,
    raw_features JSONB NOT NULL,
    total_packets INTEGER,
    total_bytes INTEGER,
    flow_duration FLOAT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_network_flows_alert
        FOREIGN KEY (alert_id)
        REFERENCES alerts(alert_id)
        ON DELETE CASCADE,

    CONSTRAINT check_packets_positive CHECK (total_packets IS NULL OR total_packets >= 0),
    CONSTRAINT check_bytes_positive CHECK (total_bytes IS NULL OR total_bytes >= 0),
    CONSTRAINT check_duration_positive CHECK (flow_duration IS NULL OR flow_duration >= 0)
);


CREATE TABLE shap_explanations (
    explanation_id SERIAL PRIMARY KEY,
    alert_id INTEGER NOT NULL UNIQUE,
    shap_values JSONB NOT NULL,
    top_features JSONB NOT NULL,
    summary TEXT NOT NULL,
    generated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    model_version VARCHAR(20),

    CONSTRAINT fk_shap_explanations_alert
        FOREIGN KEY (alert_id)
        REFERENCES alerts(alert_id)
        ON DELETE CASCADE
);


-- 3. DDL - index creation

CREATE INDEX idx_alerts_timestamp ON alerts(timestamp);
CREATE INDEX idx_alerts_attack_type ON alerts(attack_type);
CREATE INDEX idx_alerts_status ON alerts(status);
CREATE INDEX idx_alerts_prediction ON alerts(prediction);
CREATE INDEX idx_alerts_source_ip ON alerts(source_ip);
CREATE INDEX idx_alerts_destination_ip ON alerts(destination_ip);
CREATE INDEX idx_timestamp_attack_type ON alerts(timestamp, attack_type);
CREATE INDEX idx_status_timestamp ON alerts(status, timestamp);
CREATE INDEX idx_prediction_confidence ON alerts(prediction, confidence);
CREATE INDEX idx_attack_type_severity ON alerts(attack_type, severity_score);
CREATE INDEX idx_source_dest_ip ON alerts(source_ip, destination_ip);

CREATE INDEX idx_network_flows_alert ON network_flows(alert_id);
CREATE INDEX idx_network_flows_created ON network_flows(created_at);
CREATE INDEX idx_network_flows_features ON network_flows USING GIN(raw_features);

CREATE INDEX idx_shap_alert ON shap_explanations(alert_id);
CREATE INDEX idx_shap_generated_at ON shap_explanations(generated_at);
CREATE INDEX idx_shap_values ON shap_explanations USING GIN(shap_values);
CREATE INDEX idx_shap_top_features ON shap_explanations USING GIN(top_features);


-- 4. DDL - comments (just for documentation)

COMMENT ON TABLE alerts IS 'Main alerts table storing network intrusion detection results';
COMMENT ON COLUMN alerts.confidence IS 'Final ensemble confidence score (0.0-1.0)';
COMMENT ON COLUMN alerts.rf_confidence IS 'Random Forest confidence';
COMMENT ON COLUMN alerts.if_confidence IS 'Isolation Forest anomaly score';
COMMENT ON COLUMN alerts.ae_reconstruction_error IS 'Autoencoder reconstruction error';

COMMENT ON TABLE network_flows IS 'Raw CICIDS2017 flow features';
COMMENT ON TABLE shap_explanations IS 'SHAP explainability data';
