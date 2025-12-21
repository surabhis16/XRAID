from sqlalchemy import Column, Integer, String, Float, DateTime, Text
from sqlalchemy.dialects.sqlite import JSON as SQLiteJSON
from sqlalchemy.dialects.postgresql import JSONB
from datetime import datetime
from app.database import Base, DATABASE_URL

# Use JSONB for PostgreSQL, JSON for SQLite
JSONType = JSONB if "postgresql" in DATABASE_URL else SQLiteJSON

class Alert(Base):
    __tablename__ = "alerts"
    
    alert_id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    prediction = Column(String(50))
    confidence = Column(Float)
    rf_confidence = Column(Float)
    if_confidence = Column(Float)
    ae_reconstruction_error = Column(Float)
    attack_type = Column(String(50))
    source_ip = Column(String(50), nullable=True)
    source_port = Column(Integer, nullable=True)
    destination_ip = Column(String(50), nullable=True)
    destination_port = Column(Integer, nullable=True)
    status = Column(String(20), default="unreviewed")

class NetworkFlow(Base):
    __tablename__ = "network_flows"
    
    flow_id = Column(Integer, primary_key=True, index=True)
    alert_id = Column(Integer, unique=True)
    raw_features = Column(JSONType)

class ShapExplanation(Base):
    __tablename__ = "shap_explanations"
    
    explanation_id = Column(Integer, primary_key=True, index=True)
    alert_id = Column(Integer, unique=True)
    shap_values = Column(JSONType)
    top_features = Column(JSONType)
    summary = Column(Text)
    generated_at = Column(DateTime, default=datetime.utcnow)