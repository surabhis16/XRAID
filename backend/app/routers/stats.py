from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel
from typing import Dict
from datetime import datetime, timedelta
import numpy as np

from app.database import get_db
from app.models import Alert

router = APIRouter()

class StatsResponse(BaseModel):
    total_alerts: int
    total_attacks: int
    total_benign: int
    avg_confidence: float
    attack_distribution: Dict[str, int]
    recent_alerts_count: int

class TimeSeriesPoint(BaseModel):
    timestamp: str
    count: int

class ModelPerformance(BaseModel):
    avg_rf_confidence: float
    avg_ae_error: float
    high_confidence_alerts: int
    low_confidence_alerts: int

@router.get("/stats", response_model=StatsResponse)
async def get_dashboard_stats(db: Session = Depends(get_db)):
    """Get overall dashboard statistics"""
    # Total counts
    total_alerts = db.query(Alert).count()
    total_attacks = db.query(Alert).filter(Alert.prediction == 'Attack').count()
    total_benign = db.query(Alert).filter(Alert.prediction == 'Benign').count()
    
    # Average confidence
    alerts = db.query(Alert.confidence).all()
    avg_confidence = float(np.mean([a[0] for a in alerts])) if alerts else 0.0
    
    # Attack type distribution
    attack_types = db.query(
        Alert.attack_type,
        func.count(Alert.alert_id).label('count')
    ).group_by(Alert.attack_type).all()
    
    attack_dist = {attack_type: count for attack_type, count in attack_types}
    
    # Recent alerts (last hour)
    one_hour_ago = datetime.utcnow() - timedelta(hours=1)
    recent_count = db.query(Alert).filter(Alert.timestamp >= one_hour_ago).count()
    
    return StatsResponse(
        total_alerts=total_alerts,
        total_attacks=total_attacks,
        total_benign=total_benign,
        avg_confidence=avg_confidence,
        attack_distribution=attack_dist,
        recent_alerts_count=recent_count
    )

@router.get("/stats/timeseries")
async def get_timeseries_stats(
    hours: int = 24,
    db: Session = Depends(get_db)
):
    """Get time-series data for alerts"""
    cutoff_time = datetime.utcnow() - timedelta(hours=hours)
    
    # Get alerts in time range
    alerts = db.query(Alert).filter(Alert.timestamp >= cutoff_time).all()
    
    # Group by hour
    hourly_counts = {}
    for alert in alerts:
        hour_key = alert.timestamp.strftime('%Y-%m-%d %H:00')
        hourly_counts[hour_key] = hourly_counts.get(hour_key, 0) + 1
    
    # Convert to list
    timeseries = [
        {'timestamp': timestamp, 'count': count}
        for timestamp, count in sorted(hourly_counts.items())
    ]
    
    return {
        'period_hours': hours,
        'data': timeseries
    }

@router.get("/stats/attack-breakdown")
async def get_attack_breakdown(db: Session = Depends(get_db)):
    """Get detailed breakdown of attack types"""
    attack_stats = db.query(
        Alert.attack_type,
        func.count(Alert.alert_id).label('count'),
        func.avg(Alert.confidence).label('avg_confidence'),
        func.max(Alert.confidence).label('max_confidence'),
        func.min(Alert.confidence).label('min_confidence')
    ).filter(
        Alert.attack_type != 'Benign'
    ).group_by(Alert.attack_type).all()
    
    breakdown = []
    for attack_type, count, avg_conf, max_conf, min_conf in attack_stats:
        breakdown.append({
            'attack_type': attack_type,
            'count': count,
            'avg_confidence': float(avg_conf) if avg_conf else 0.0,
            'max_confidence': float(max_conf) if max_conf else 0.0,
            'min_confidence': float(min_conf) if min_conf else 0.0
        })
    
    return {
        'breakdown': breakdown,
        'total_attack_types': len(breakdown)
    }

@router.get("/stats/model-performance", response_model=ModelPerformance)
async def get_model_performance(db: Session = Depends(get_db)):
    """Get model performance metrics"""
    alerts = db.query(Alert).all()
    
    if not alerts:
        return ModelPerformance(
            avg_rf_confidence=0.0,
            avg_ae_error=0.0,
            high_confidence_alerts=0,
            low_confidence_alerts=0
        )
    
    rf_confidences = [a.rf_confidence for a in alerts if a.rf_confidence is not None]
    ae_errors = [a.ae_reconstruction_error for a in alerts if a.ae_reconstruction_error is not None]
    
    avg_rf = float(np.mean(rf_confidences)) if rf_confidences else 0.0
    avg_ae = float(np.mean(ae_errors)) if ae_errors else 0.0
    
    high_conf = len([a for a in alerts if a.confidence >= 0.9])
    low_conf = len([a for a in alerts if a.confidence < 0.7])
    
    return ModelPerformance(
        avg_rf_confidence=avg_rf,
        avg_ae_error=avg_ae,
        high_confidence_alerts=high_conf,
        low_confidence_alerts=low_conf
    )

@router.get("/stats/confidence-distribution")
async def get_confidence_distribution(db: Session = Depends(get_db)):
    """Get distribution of confidence scores"""
    alerts = db.query(Alert.confidence).all()
    confidences = [a[0] for a in alerts]
    
    if not confidences:
        return {
            'bins': [],
            'counts': [],
            'total': 0
        }
    
    # Create bins: 0-0.5, 0.5-0.7, 0.7-0.9, 0.9-1.0
    bins = [0, 0.5, 0.7, 0.9, 1.0]
    bin_labels = ['0-50%', '50-70%', '70-90%', '90-100%']
    
    counts = [0, 0, 0, 0]
    for conf in confidences:
        if conf < 0.5:
            counts[0] += 1
        elif conf < 0.7:
            counts[1] += 1
        elif conf < 0.9:
            counts[2] += 1
        else:
            counts[3] += 1
    
    return {
        'bins': bin_labels,
        'counts': counts,
        'total': len(confidences)
    }

@router.get("/database/info")
async def database_info(db: Session = Depends(get_db)):
    from app.db_utils import get_database_statistics, get_table_sizes
    return {
        'statistics': get_database_statistics(db),
        'table_sizes': get_table_sizes(db)
    }