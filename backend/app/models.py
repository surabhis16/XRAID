from sqlalchemy import Column, Integer, String, Float, DateTime, Text, ForeignKey, CheckConstraint, Index, Boolean, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import JSONB, INET
from sqlalchemy.dialects.sqlite import JSON as SQLiteJSON
from sqlalchemy.orm import relationship, validates
from datetime import datetime
from typing import Optional
import enum
from app.database import Base, DATABASE_URL

JSONType = JSONB if "postgresql" in DATABASE_URL else SQLiteJSON

# Enums for type safety
class StatusEnum(enum.Enum):
    """Alert review status"""
    UNREVIEWED = "unreviewed"
    INVESTIGATING = "investigating"
    RESOLVED = "resolved"
    FALSE_POSITIVE = "false_positive"

class PredictionEnum(enum.Enum):
    """Binary prediction result"""
    ATTACK = "Attack"
    BENIGN = "Benign"

class AttackTypeEnum(enum.Enum):
    """Known attack types from CICIDS2017"""
    BENIGN = "Benign"
    DDOS = "DDoS"
    DOS = "DoS"
    PORTSCAN = "PortScan"
    BRUTEFORCE = "BruteForce"
    WEBATTACK = "WebAttack"
    BOTNET = "Botnet"
    INFILTRATION = "Infiltration"
    EXPLOIT = "Exploit"

class Alert(Base):
    """
    Main alerts table storing network intrusion detection results
    Demonstrates: Primary keys, foreign keys, constraints, indexes, relationships
    """
    __tablename__ = "alerts"
    
    # Primary Key with auto-increment
    alert_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    
    # Timestamps (indexed for time-based queries)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Prediction Results (indexed for filtering)
    prediction = Column(String(50), nullable=False, index=True)
    attack_type = Column(String(50), nullable=False, index=True)
    
    # Confidence Scores with constraints (0.0 to 1.0)
    confidence = Column(Float, nullable=False)
    rf_confidence = Column(Float, nullable=False)
    if_confidence = Column(Float, nullable=False)
    ae_reconstruction_error = Column(Float, nullable=False)
    
    # Network Information (optional, use INET type for PostgreSQL)
    source_ip = Column(String(45), nullable=True, index=True)  # 45 chars for IPv6
    source_port = Column(Integer, nullable=True)
    destination_ip = Column(String(45), nullable=True, index=True)
    destination_port = Column(Integer, nullable=True)
    
    # Protocol information
    protocol = Column(String(10), nullable=True)  # TCP, UDP, ICMP, etc.
    
    # Status tracking with index for unreviewed alerts
    status = Column(String(20), nullable=False, default="unreviewed", index=True)
    
    # Severity score (calculated from confidence + attack type)
    severity_score = Column(Float, nullable=True)
    
    # Analyst notes
    analyst_notes = Column(Text, nullable=True)
    reviewed_by = Column(String(100), nullable=True)
    reviewed_at = Column(DateTime, nullable=True)
    
    # Relationships (one-to-one with cascade delete)
    network_flow = relationship(
        "NetworkFlow", 
        back_populates="alert", 
        uselist=False, 
        cascade="all, delete-orphan"
    )
    shap_explanation = relationship(
        "ShapExplanation", 
        back_populates="alert", 
        uselist=False, 
        cascade="all, delete-orphan"
    )
    
    # Table-level constraints
    __table_args__ = (
        # Data integrity constraints
        CheckConstraint('confidence >= 0.0 AND confidence <= 1.0', name='check_confidence_range'),
        CheckConstraint('rf_confidence >= 0.0 AND rf_confidence <= 1.0', name='check_rf_confidence_range'),
        CheckConstraint('if_confidence >= -1.0 AND if_confidence <= 1.0', name='check_if_confidence_range'),
        CheckConstraint('ae_reconstruction_error >= 0.0', name='check_ae_error_positive'),
        CheckConstraint('severity_score IS NULL OR (severity_score >= 0.0 AND severity_score <= 100.0)', name='check_severity_range'),
        
        # Enum-like constraints
        CheckConstraint(
            "status IN ('unreviewed', 'investigating', 'resolved', 'false_positive')", 
            name='check_status_valid'
        ),
        CheckConstraint(
            "prediction IN ('Attack', 'Benign')", 
            name='check_prediction_valid'
        ),
        CheckConstraint(
            "attack_type IN ('Benign', 'DDoS', 'DoS', 'PortScan', 'BruteForce', 'WebAttack', 'Botnet', 'Infiltration', 'Exploit')", 
            name='check_attack_type_valid'
        ),
        
        # Port range constraints
        CheckConstraint(
            'source_port IS NULL OR (source_port >= 0 AND source_port <= 65535)', 
            name='check_source_port_range'
        ),
        CheckConstraint(
            'destination_port IS NULL OR (destination_port >= 0 AND destination_port <= 65535)', 
            name='check_dest_port_range'
        ),
        
        # Logical constraint: if reviewed, must have reviewer and timestamp
        CheckConstraint(
            "(status = 'unreviewed') OR (reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL)",
            name='check_review_consistency'
        ),
        
        # Composite indexes for common query patterns
        Index('idx_timestamp_attack_type', 'timestamp', 'attack_type'),
        Index('idx_status_timestamp', 'status', 'timestamp'),
        Index('idx_prediction_confidence', 'prediction', 'confidence'),
        Index('idx_attack_type_severity', 'attack_type', 'severity_score'),
        Index('idx_source_dest_ip', 'source_ip', 'destination_ip'),
    )
    
    # Validators (application-level)
    @validates('confidence', 'rf_confidence')
    def validate_confidence(self, key, value):
        """Ensure confidence values are between 0 and 1"""
        if value is not None and not (0.0 <= value <= 1.0):
            raise ValueError(f"{key} must be between 0.0 and 1.0")
        return value
    
    @validates('source_port', 'destination_port')
    def validate_port(self, key, value):
        """Ensure port numbers are valid"""
        if value is not None and not (0 <= value <= 65535):
            raise ValueError(f"{key} must be between 0 and 65535")
        return value
    
    def __repr__(self):
        return f"<Alert(id={self.alert_id}, type={self.attack_type}, confidence={self.confidence:.2f}, status={self.status})>"
    
    def to_dict(self):
        """Convert to dictionary for JSON serialization"""
        return {
            'alert_id': self.alert_id,
            'timestamp': self.timestamp.isoformat() if self.timestamp else None,
            'prediction': self.prediction,
            'attack_type': self.attack_type,
            'confidence': self.confidence,
            'status': self.status,
            'severity_score': self.severity_score,
            'source_ip': self.source_ip,
            'destination_ip': self.destination_ip
        }


class NetworkFlow(Base):
    """
    Stores raw network flow features for each alert
    Demonstrates: Foreign keys with CASCADE, JSONB storage, unique constraints
    """
    __tablename__ = "network_flows"
    
    flow_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    alert_id = Column(
        Integer, 
        ForeignKey('alerts.alert_id', ondelete='CASCADE'),
        nullable=False,
        unique=True,
        index=True
    )
    
    # Raw feature data (78 features from CICIDS2017)
    raw_features = Column(JSONType, nullable=False)
    
    # Feature statistics (for quick access without parsing JSON)
    total_packets = Column(Integer, nullable=True)
    total_bytes = Column(Integer, nullable=True)
    flow_duration = Column(Float, nullable=True)
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationship
    alert = relationship("Alert", back_populates="network_flow")
    
    __table_args__ = (
        # Ensure positive values
        CheckConstraint('total_packets IS NULL OR total_packets >= 0', name='check_packets_positive'),
        CheckConstraint('total_bytes IS NULL OR total_bytes >= 0', name='check_bytes_positive'),
        CheckConstraint('flow_duration IS NULL OR flow_duration >= 0', name='check_duration_positive'),
        
        Index('idx_network_flow_alert', 'alert_id'),
        Index('idx_network_flow_created', 'created_at'),
    )
    
    def __repr__(self):
        return f"<NetworkFlow(id={self.flow_id}, alert_id={self.alert_id})>"


class ShapExplanation(Base):
    """
    Stores SHAP (SHapley Additive exPlanations) values for model interpretability
    Demonstrates: Text fields, JSONB arrays, foreign key relationships
    """
    __tablename__ = "shap_explanations"
    
    explanation_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    alert_id = Column(
        Integer, 
        ForeignKey('alerts.alert_id', ondelete='CASCADE'),
        nullable=False,
        unique=True,
        index=True
    )
    
    # SHAP data (JSONB for efficient querying in PostgreSQL)
    shap_values = Column(JSONType, nullable=False)  # Array of 78 SHAP values
    top_features = Column(JSONType, nullable=False)  # Top 5 features with contributions
    summary = Column(Text, nullable=False)  # Human-readable explanation
    
    # Metadata
    generated_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    model_version = Column(String(20), nullable=True)  # Track which model version generated this
    
    # Relationship
    alert = relationship("Alert", back_populates="shap_explanation")
    
    __table_args__ = (
        Index('idx_shap_alert', 'alert_id'),
        Index('idx_shap_generated_at', 'generated_at'),
    )
    
    def __repr__(self):
        return f"<ShapExplanation(id={self.explanation_id}, alert_id={self.alert_id})>"